import { BillingService } from './billing.service';
import {
  StripeWebhookEvent,
  StripeWebhookService,
} from './stripe-webhook.service';
import { CacheService } from '@/common/cache/cache.service';
import { Plan } from '@/common/types/plan.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import { TenantProvisioningService } from '@/modules/tenants/tenant-provisioning.service';
import { vi } from 'vitest';

describe('StripeWebhookService', () => {
  const tenantsRepo = {
    update: vi.fn(),
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
  };
  const subscriptionsRepo = { upsert: vi.fn(), update: vi.fn() };
  const billingEventsRepo = { save: vi.fn(), update: vi.fn() };
  const featureFlagsRepo = { delete: vi.fn() };
  const billingService = { planFromPriceId: vi.fn() };
  const provisioningService = {
    provision: vi.fn(),
    seedFeatureFlags: vi.fn(),
    cacheFeatureFlags: vi.fn(),
  };
  const cache = { del: vi.fn() };
  let service: StripeWebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    tenantsRepo.findOneOrFail.mockResolvedValue({
      id: 'tenant-1',
      slug: 'clinic-a',
      plan: Plan.PRO,
    });
    tenantsRepo.update.mockResolvedValue(undefined);
    billingEventsRepo.save.mockResolvedValue(undefined);
    billingEventsRepo.update.mockResolvedValue(undefined);
    provisioningService.provision.mockResolvedValue(undefined);
    cache.del.mockResolvedValue(undefined);
    service = new StripeWebhookService(
      tenantsRepo as never,
      subscriptionsRepo as never,
      billingEventsRepo as never,
      featureFlagsRepo as never,
      billingService as unknown as BillingService,
      provisioningService as unknown as TenantProvisioningService,
      cache as unknown as CacheService,
    );
  });

  it('ignores duplicate billing events during audit logging', async () => {
    billingEventsRepo.save.mockRejectedValueOnce(new Error('duplicate key'));

    await expect(service.logEvent(makeEvent())).resolves.toBeUndefined();
  });

  it('does not provision checkout sessions without tenant metadata', async () => {
    await service.logEvent(makeEvent({ metadata: {} }));
    await service.process(makeEvent({ metadata: {} }));

    expect(provisioningService.provision).not.toHaveBeenCalled();
    expect(billingEventsRepo.update).toHaveBeenCalledWith(
      { stripeEventId: 'evt-1' },
      { processed: true },
    );
  });

  it('marks tenant provisioning and delegates provisioning on checkout completion', async () => {
    await service.logEvent(makeEvent());
    await service.process(makeEvent());

    expect(tenantsRepo.update).toHaveBeenCalledWith('tenant-1', {
      status: TenantStatus.PROVISIONING,
    });
    expect(cache.del).toHaveBeenCalledWith('tenant:tenant-1');
    expect(provisioningService.provision).toHaveBeenCalledWith(
      'tenant-1',
      Plan.PRO,
    );
    expect(billingEventsRepo.update).toHaveBeenCalledWith(
      { stripeEventId: 'evt-1' },
      { processed: true },
    );
  });

  it('records webhook processing errors without marking the event processed', async () => {
    provisioningService.provision.mockRejectedValueOnce(
      new Error('provisioning failed'),
    );

    await service.logEvent(makeEvent());
    await service.process(makeEvent());

    expect(billingEventsRepo.update).toHaveBeenCalledWith(
      { stripeEventId: 'evt-1' },
      { errorMessage: 'provisioning failed' },
    );
    expect(billingEventsRepo.update).not.toHaveBeenCalledWith(
      { stripeEventId: 'evt-1' },
      { processed: true },
    );
  });
});

function makeEvent(
  object: Record<string, unknown> = { metadata: { tenantId: 'tenant-1' } },
): StripeWebhookEvent {
  return {
    id: 'evt-1',
    type: 'checkout.session.completed',
    data: { object },
  };
}
