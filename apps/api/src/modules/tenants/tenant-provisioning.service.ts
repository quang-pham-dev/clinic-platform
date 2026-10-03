/**
 * TenantProvisioningService — creates tenant PostgreSQL schema,
 * runs P1–P4 migrations, seeds admin user, seeds feature flags,
 * and caches them in Redis.
 *
 * See docs/5/03-database-schema.md §4
 */
import { FeatureFlag } from './entities/feature-flag.entity';
import { Tenant } from './entities/tenant.entity';
import { CacheService } from '@/common/cache/cache.service';
import { TenantDatabaseService } from '@/common/database/tenant-database.service';
import { PLAN_FEATURES, Plan } from '@/common/types/plan.enum';
import { Role } from '@/common/types/role.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import { UserProfile } from '@/modules/users/entities/user-profile.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  DataSource,
  EntityManager,
  MigrationInterface,
  QueryRunner,
  Repository,
} from 'typeorm';

const PUBLIC_MIGRATION_TIMESTAMP = 1776000000000;
const REQUIRED_TENANT_TABLES = [
  'users',
  'doctors',
  'time_slots',
  'appointments',
  'medical_records',
  'patient_files',
  'patient_consents',
] as const;

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantDatabase: TenantDatabaseService,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(FeatureFlag)
    private readonly featureFlagsRepo: Repository<FeatureFlag>,
    private readonly cache: CacheService,
  ) {}

  /**
   * Full provisioning pipeline:
   * 1. Create PostgreSQL schema
   * 2. Run all P1–P4 migrations against the new schema
   * 3. Seed feature flags for the selected plan
   * 4. Cache feature flags in Redis
   * 5. Mark tenant as active
   */
  async provision(tenantId: string, plan: Plan): Promise<void> {
    const tenant = await this.tenantsRepo.findOneOrFail({
      where: { id: tenantId },
    });
    const schemaName = tenant.schemaName;

    this.logger.log(
      `Provisioning tenant: ${tenant.slug} (schema=${schemaName}, plan=${plan})`,
    );

    try {
      // 1. Create schema (idempotent)
      await this.dataSource.query(
        `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
      );

      // 2. Run P1–P4 migrations in the tenant schema.
      // Fail closed until real tenant migrations are wired so tenants are not
      // marked active without a complete isolated schema.
      await this.runTenantMigrations(schemaName);

      // 3. Verify the tenant schema and seed its first administrator.
      await this.verifyAndSeedTenantAdmin(schemaName, tenant.adminEmail);

      // 4. Seed feature flags for plan
      await this.seedFeatureFlags(tenantId, plan);

      // 5. Cache feature flags in Redis
      await this.cacheFeatureFlags(tenantId);

      // 6. Mark tenant active
      await this.tenantsRepo.update(tenantId, {
        status: TenantStatus.ACTIVE,
        provisionedAt: new Date(),
      });

      // Invalidate tenant cache
      await this.cache.del(`tenant:${tenantId}`);

      this.logger.log(`Tenant provisioned successfully: ${tenant.slug}`);
    } catch (error) {
      this.logger.error(
        `Provisioning failed for tenant ${tenant.slug}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Mark as pending so it can be retried
      await this.tenantsRepo.update(tenantId, {
        status: TenantStatus.PENDING,
      });
      throw error;
    }
  }

  /**
   * Seed feature flags for a given plan.
   * Deletes existing plan-derived flags and re-creates them.
   */
  async seedFeatureFlags(tenantId: string, plan: Plan): Promise<void> {
    // Remove existing plan-derived flags (keep overrides)
    await this.featureFlagsRepo.delete({
      tenantId,
      source: 'plan',
    });

    const planFeatures = PLAN_FEATURES[plan];
    const flags = Object.entries(planFeatures).map(([feature, enabled]) => ({
      tenantId,
      feature,
      enabled,
      source: 'plan' as const,
    }));

    await this.featureFlagsRepo.save(flags);
    this.logger.log(
      `Feature flags seeded: tenant=${tenantId}, plan=${plan}, count=${flags.length}`,
    );
  }

  /**
   * Load feature flags from DB and cache in Redis.
   */
  async cacheFeatureFlags(tenantId: string): Promise<void> {
    const flags = await this.featureFlagsRepo.find({
      where: { tenantId },
    });
    const flagMap = Object.fromEntries(
      flags.map((f) => [f.feature, f.enabled]),
    );
    await this.cache.set(`featureFlags:${tenantId}`, flagMap, {
      ttl: 3600,
    });
  }

  /**
   * Run P1–P4 schema migrations against a specific tenant schema.
   * This sets search_path and uses the DataSource migration runner.
   */
  private async runTenantMigrations(schemaName: string): Promise<void> {
    this.logger.log(`Running migrations for schema: ${schemaName}`);

    const tenantMigrations = this.dataSource.migrations
      .filter((migration) => {
        const name = migration.name ?? '';
        const timestamp = Number(name.split('-')[0]);
        return (
          Number.isFinite(timestamp) && timestamp < PUBLIC_MIGRATION_TIMESTAMP
        );
      })
      .sort((left, right) =>
        (left.name ?? '').localeCompare(right.name ?? ''),
      ) as unknown as Array<new () => MigrationInterface>;

    await this.tenantDatabase.runInTenantSchema(
      schemaName,
      async (manager: EntityManager) => {
        const queryRunner = manager.queryRunner as QueryRunner | undefined;
        if (!queryRunner) {
          throw new Error(
            'TENANT_MIGRATION_QUERY_RUNNER_UNAVAILABLE: migrations require the tenant query runner',
          );
        }

        for (const Migration of tenantMigrations) {
          const migration = new Migration();
          await migration.up(queryRunner);
        }
      },
    );

    this.logger.log(
      `Tenant migrations completed for schema: ${schemaName} (${tenantMigrations.length} migrations)`,
    );
  }

  private async verifyAndSeedTenantAdmin(
    schemaName: string,
    adminEmail: string,
  ): Promise<void> {
    await this.tenantDatabase.runInTenantSchema(schemaName, async (manager) => {
      const rows = (await manager.query(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name = ANY($2::text[])`,
        [schemaName, [...REQUIRED_TENANT_TABLES]],
      )) as Array<{ table_name: string }>;
      const existingTables = new Set(rows.map((row) => row.table_name));
      const missingTables = REQUIRED_TENANT_TABLES.filter(
        (table) => !existingTables.has(table),
      );

      if (missingTables.length > 0) {
        throw new Error(
          `TENANT_SCHEMA_INCOMPLETE: missing tables: ${missingTables.join(', ')}`,
        );
      }

      const normalizedEmail = adminEmail.toLowerCase();
      const existingAdmin = await manager.findOne(User, {
        where: { email: normalizedEmail },
      });
      if (existingAdmin) return;

      // The random credential is intentionally never exposed. The account is
      // activated through the platform's password-reset/invitation flow.
      const passwordHash = await bcrypt.hash(
        randomBytes(32).toString('hex'),
        12,
      );
      const admin = manager.create(User, {
        email: normalizedEmail,
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      });
      const savedAdmin = await manager.save(admin);
      await manager.save(
        manager.create(UserProfile, {
          userId: savedAdmin.id,
          fullName: normalizedEmail.split('@')[0] || 'Clinic Administrator',
        }),
      );
    });
  }
}
