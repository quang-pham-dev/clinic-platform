import { TenantMiddleware } from './tenant.middleware';
import { TenantContextService } from '@/common/context/tenant-context.service';
import { Feature } from '@/common/types/feature.enum';
import { Plan } from '@/common/types/plan.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import { FeatureFlag } from '@/modules/tenants/entities/feature-flag.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { vi } from 'vitest';

describe('TenantMiddleware', () => {
  const tenantsRepo = { findOne: vi.fn() };
  const flagsRepo = { find: vi.fn() };
  const dataSource = {
    query: vi.fn(),
    getRepository: vi.fn((entity) => {
      if (entity === Tenant) return tenantsRepo;
      if (entity === FeatureFlag) return flagsRepo;
      throw new Error('unexpected repository');
    }),
  };
  const tenantCtx = { run: vi.fn((_context, callback) => callback()) };
  const cache = { get: vi.fn(), set: vi.fn() };
  const next = vi.fn();

  let middleware: TenantMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
    tenantsRepo.findOne.mockResolvedValue(makeTenant());
    flagsRepo.find.mockResolvedValue([
      { feature: Feature.FILE_UPLOAD, enabled: true },
    ]);
    middleware = new TenantMiddleware(
      dataSource as never,
      tenantCtx as unknown as TenantContextService,
      cache as never,
    );
  });

  it('rejects requests without a tenant header', async () => {
    await expect(
      middleware.use(makeRequest(), {} as Response, next),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects unknown tenants', async () => {
    tenantsRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      middleware.use(makeRequest('tenant-1'), {} as Response, next),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects suspended tenants', async () => {
    tenantsRepo.findOne.mockResolvedValueOnce(
      makeTenant({ status: TenantStatus.SUSPENDED }),
    );

    await expect(
      middleware.use(makeRequest('tenant-1'), {} as Response, next),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([TenantStatus.PENDING, TenantStatus.PROVISIONING])(
    'rejects %s tenants',
    async (status) => {
      tenantsRepo.findOne.mockResolvedValueOnce(makeTenant({ status }));

      await expect(
        middleware.use(makeRequest('tenant-1'), {} as Response, next),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );

  it('stores tenant context for active tenants without mutating shared search_path', async () => {
    await middleware.use(makeRequest('tenant-1'), {} as Response, next);

    expect(dataSource.query).not.toHaveBeenCalled();
    expect(tenantCtx.run).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        tenantSlug: 'clinic-a',
        plan: Plan.PRO,
        schemaName: 'tenant_clinic_a',
        featureFlags: new Set([Feature.FILE_UPLOAD]),
      }),
      expect.any(Function),
    );
    expect(next).toHaveBeenCalledOnce();
  });
});

function makeRequest(tenantId?: string): Request {
  return {
    headers: tenantId ? { 'x-tenant-id': tenantId } : {},
  } as Request;
}

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    slug: 'clinic-a',
    name: 'Clinic A',
    adminEmail: 'admin@example.com',
    status: TenantStatus.ACTIVE,
    schemaName: 'tenant_clinic_a',
    stripeCustomerId: null,
    plan: Plan.PRO,
    provisionedAt: null,
    suspendedAt: null,
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    ...overrides,
  };
}
