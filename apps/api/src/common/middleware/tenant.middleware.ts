/**
 * TenantMiddleware — the most critical component in P5.
 * Runs on every request (except health, billing/webhook, super/**).
 * Resolves tenant from X-Tenant-ID header, validates status,
 * sets PostgreSQL search_path, and populates AsyncLocalStorage context.
 *
 * See docs/5/05-tenant-middleware.md §1
 */
import { CacheService } from '@/common/cache/cache.service';
import { TenantContextService } from '@/common/context/tenant-context.service';
import { Feature } from '@/common/types/feature.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import { FeatureFlag } from '@/modules/tenants/entities/feature-flag.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
  Injectable,
  Logger,
  NestMiddleware,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';

const TENANT_CACHE_TTL = 300; // 5 minutes
const FEATURE_FLAGS_CACHE_TTL = 3600; // 1 hour

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantCtx: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new UnauthorizedException({ code: 'TENANT_MISSING' });
    }

    // 1. Load tenant (cache first, DB fallback)
    const tenant = await this.resolveTenant(tenantId);

    // 2. Guard: block suspended tenants
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ServiceUnavailableException({
        code: 'TENANT_SUSPENDED',
        message:
          'This clinic account has been suspended. Please contact support.',
      });
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ServiceUnavailableException({
        code: 'TENANT_NOT_ACTIVE',
      });
    }

    // 3. Load feature flags (cache first, DB fallback)
    const featureFlags = await this.resolveFeatureFlags(tenantId);

    // 4. Set PostgreSQL search_path for this request
    await this.dataSource.query(
      `SET search_path = "${tenant.schemaName}", public`,
    );

    // 5. Store context in AsyncLocalStorage — available to all services
    this.tenantCtx.run(
      {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        plan: tenant.plan,
        schemaName: tenant.schemaName,
        featureFlags,
      },
      () => next(),
    );
  }

  private async resolveTenant(tenantId: string): Promise<Tenant> {
    const cacheKey = `tenant:${tenantId}`;
    const cached = await this.cache.get<Tenant>(cacheKey);

    if (cached) {
      return cached;
    }

    const tenantsRepo = this.dataSource.getRepository(Tenant);
    const tenant = await tenantsRepo.findOne({ where: { id: tenantId } });

    if (!tenant) {
      this.logger.warn(`Tenant not found: ${tenantId}`);
      throw new UnauthorizedException({ code: 'TENANT_MISSING' });
    }

    await this.cache.set(cacheKey, tenant, { ttl: TENANT_CACHE_TTL });
    return tenant;
  }

  private async resolveFeatureFlags(tenantId: string): Promise<Set<Feature>> {
    const cacheKey = `featureFlags:${tenantId}`;
    const cached = await this.cache.get<Record<string, boolean>>(cacheKey);

    if (cached) {
      return new Set(
        Object.entries(cached)
          .filter(([, v]) => v)
          .map(([k]) => k as Feature),
      );
    }

    // Fallback: load from DB and cache
    const flagsRepo = this.dataSource.getRepository(FeatureFlag);
    const flags = await flagsRepo.find({
      where: { tenantId, enabled: true },
    });
    const flagMap = Object.fromEntries(
      flags.map((f) => [f.feature, f.enabled]),
    );
    await this.cache.set(cacheKey, flagMap, { ttl: FEATURE_FLAGS_CACHE_TTL });

    return new Set(flags.map((f) => f.feature as Feature));
  }
}
