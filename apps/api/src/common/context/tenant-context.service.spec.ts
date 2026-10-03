import { TenantContextService } from './tenant-context.service';
import { Feature } from '@/common/types/feature.enum';
import { Plan } from '@/common/types/plan.enum';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    service = new TenantContextService();
  });

  it('returns false when context is not initialized', () => {
    expect(service.isAvailable()).toBe(false);
  });

  it('throws when reading context outside a tenant request', () => {
    expect(() => service.get()).toThrow('TenantContext not initialized');
  });

  it('exposes tenant context inside run()', () => {
    const result = service.run(
      {
        tenantId: 'tenant-1',
        tenantSlug: 'clinic-a',
        plan: Plan.PRO,
        schemaName: 'tenant_clinic_a',
        featureFlags: new Set([Feature.FILE_UPLOAD]),
      },
      () => ({
        tenantId: service.tenantId,
        plan: service.plan,
        schemaName: service.schemaName,
        hasFileUpload: service.hasFeature(Feature.FILE_UPLOAD),
      }),
    );

    expect(result).toEqual({
      tenantId: 'tenant-1',
      plan: Plan.PRO,
      schemaName: 'tenant_clinic_a',
      hasFileUpload: true,
    });
  });
});
