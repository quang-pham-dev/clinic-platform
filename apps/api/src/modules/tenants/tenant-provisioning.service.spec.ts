import { TenantProvisioningService } from './tenant-provisioning.service';
import { CacheService } from '@/common/cache/cache.service';
import { TenantDatabaseService } from '@/common/database/tenant-database.service';
import { Plan } from '@/common/types/plan.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import { FeatureFlag } from '@/modules/tenants/entities/feature-flag.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';

describe('TenantProvisioningService', () => {
  const tenantsRepo = {
    findOneOrFail: vi.fn(),
    update: vi.fn(),
  };
  const featureFlagsRepo = {
    delete: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
  };
  const dataSource = { migrations: [], query: vi.fn() };
  const tenantDatabase = {
    runInTenantSchema: vi.fn(),
  };
  const tenantManager = {
    queryRunner: { manager: {} },
    query: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((_entity, data) => data),
    save: vi.fn(async (value) => ({ id: 'admin-1', ...value })),
  };
  const cache = { del: vi.fn(), set: vi.fn() };
  let service: TenantProvisioningService;

  beforeEach(async () => {
    vi.clearAllMocks();
    tenantsRepo.findOneOrFail.mockResolvedValue({
      id: 'tenant-1',
      slug: 'clinic-a',
      adminEmail: 'admin@example.com',
      schemaName: 'tenant_clinic_a',
      plan: Plan.PRO,
    });
    tenantsRepo.update.mockResolvedValue(undefined);
    featureFlagsRepo.delete.mockResolvedValue(undefined);
    featureFlagsRepo.save.mockResolvedValue(undefined);
    featureFlagsRepo.find.mockResolvedValue([]);
    tenantManager.query.mockResolvedValue([
      { table_name: 'users' },
      { table_name: 'doctors' },
      { table_name: 'time_slots' },
      { table_name: 'appointments' },
      { table_name: 'medical_records' },
      { table_name: 'patient_files' },
      { table_name: 'patient_consents' },
    ]);
    tenantManager.findOne.mockResolvedValue(null);
    tenantDatabase.runInTenantSchema.mockImplementation(
      async (_schemaName, callback) => callback(tenantManager),
    );
    cache.del.mockResolvedValue(undefined);
    cache.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantProvisioningService,
        { provide: DataSource, useValue: dataSource },
        { provide: TenantDatabaseService, useValue: tenantDatabase },
        { provide: getRepositoryToken(Tenant), useValue: tenantsRepo },
        {
          provide: getRepositoryToken(FeatureFlag),
          useValue: featureFlagsRepo,
        },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(TenantProvisioningService);
  });

  it('marks tenant pending again when schema creation fails', async () => {
    tenantDatabase.runInTenantSchema.mockRejectedValueOnce(
      new Error('database unavailable'),
    );

    await expect(service.provision('tenant-1', Plan.PRO)).rejects.toThrow(
      'database unavailable',
    );

    expect(tenantsRepo.update).toHaveBeenCalledWith('tenant-1', {
      status: TenantStatus.PENDING,
    });
  });

  it('runs tenant migrations through the isolated database boundary', async () => {
    dataSource.migrations = [
      class CreateUsersTable {
        name = '1742500002000-CreateUsersTable';
        up = vi.fn().mockResolvedValue(undefined);
      },
      class CreatePublicTenantTable {
        name = '1776000001000-CreateTenantsTable';
        up = vi.fn().mockResolvedValue(undefined);
      },
    ] as never;

    await service.provision('tenant-1', Plan.PRO);

    expect(tenantDatabase.runInTenantSchema).toHaveBeenCalledWith(
      'tenant_clinic_a',
      expect.any(Function),
    );
    expect(tenantsRepo.update).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ status: TenantStatus.ACTIVE }),
    );
    expect(tenantManager.query).toHaveBeenCalledWith(
      expect.stringContaining('information_schema.tables'),
      ['tenant_clinic_a', expect.any(Array)],
    );
    expect(tenantManager.save).toHaveBeenCalledTimes(2);
  });

  it('fails closed when required tenant tables are missing', async () => {
    tenantManager.query.mockResolvedValueOnce([{ table_name: 'users' }]);

    await expect(service.provision('tenant-1', Plan.PRO)).rejects.toThrow(
      'TENANT_SCHEMA_INCOMPLETE',
    );

    expect(tenantsRepo.update).not.toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ status: TenantStatus.ACTIVE }),
    );
  });
});
