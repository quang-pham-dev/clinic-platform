/**
 * StripeWebhookService — processes Stripe webhook events asynchronously.
 * P5: See docs/5/06-billing-and-stripe.md §3
 *
 * Key principle: Stripe webhooks are the source of truth for plan state (ADR-014).
 *
 * Note: Stripe v22 uses granular event types (EventBase) instead of Stripe.Event.
 * We use `EventBase` as the common base for all webhook events.
 */
import { BillingService } from './billing.service';
import { BillingEvent } from './entities/billing-event.entity';
import { Subscription } from './entities/subscription.entity';
import { CacheService } from '@/common/cache/cache.service';
import { Plan } from '@/common/types/plan.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import { FeatureFlag } from '@/modules/tenants/entities/feature-flag.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { TenantProvisioningService } from '@/modules/tenants/tenant-provisioning.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/** Minimal shape of a Stripe webhook event for handler routing. */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { object: any };
}

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(BillingEvent)
    private readonly billingEventsRepo: Repository<BillingEvent>,
    @InjectRepository(FeatureFlag)
    private readonly featureFlagsRepo: Repository<FeatureFlag>,
    private readonly billingService: BillingService,
    private readonly provisioningService: TenantProvisioningService,
    private readonly cache: CacheService,
  ) {}

  /** Log every Stripe event for audit trail. */
  async logEvent(event: StripeWebhookEvent): Promise<void> {
    try {
      await this.billingEventsRepo.save({
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data?.object as Record<string, unknown>,
        processed: false,
      });
    } catch {
      // Idempotency — duplicate event IDs are ignored
      this.logger.warn(`Duplicate Stripe event: ${event.id}`);
    }
  }

  /** Route event to the appropriate handler. */
  async process(event: StripeWebhookEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event);
          break;
        default:
          this.logger.debug(`Unhandled Stripe event: ${event.type}`);
      }

      // Mark as processed
      await this.billingEventsRepo.update(
        { stripeEventId: event.id },
        { processed: true },
      );
    } catch (error) {
      this.logger.error(
        `Error processing Stripe event ${event.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      await this.billingEventsRepo.update(
        { stripeEventId: event.id },
        { errorMessage: (error as Error).message },
      );
    }
  }

  private async handleCheckoutCompleted(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const session = event.data?.object as Record<string, unknown>;
    const tenantId =
      (session?.metadata as Record<string, string>)?.tenantId ?? null;

    if (!tenantId) {
      this.logger.warn(
        'checkout.session.completed without tenantId in metadata',
      );
      return;
    }

    // Update billing event with tenant
    await this.billingEventsRepo.update(
      { stripeEventId: event.id },
      { tenantId },
    );

    // Mark as provisioning
    await this.tenantsRepo.update(tenantId, {
      status: TenantStatus.PROVISIONING,
    });
    await this.cache.del(`tenant:${tenantId}`);

    // Provision tenant synchronously for now (BullMQ job in production)
    const tenant = await this.tenantsRepo.findOneOrFail({
      where: { id: tenantId },
    });
    await this.provisioningService.provision(tenant.id, tenant.plan);

    this.logger.log(`Checkout completed → provisioning: tenant=${tenantId}`);
  }

  private async handleSubscriptionUpdated(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const sub = event.data?.object as Record<string, unknown>;
    const customerId = sub?.customer as string;
    const tenant = await this.tenantsRepo.findOne({
      where: { stripeCustomerId: customerId },
    });
    if (!tenant) return;

    const items = sub?.items as { data: Array<{ price: { id: string } }> };
    const priceId = items?.data?.[0]?.price?.id;
    const newPlan = priceId
      ? this.billingService.planFromPriceId(priceId)
      : tenant.plan;

    // Upsert subscription record
    await this.subscriptionsRepo.upsert(
      {
        tenantId: tenant.id,
        stripeSubscriptionId: sub?.id as string,
        stripePriceId: priceId ?? '',
        plan: newPlan,
        status: (sub?.status as string) ?? 'active',
        currentPeriodStart: new Date(
          ((sub?.current_period_start as number) ?? 0) * 1000,
        ),
        currentPeriodEnd: new Date(
          ((sub?.current_period_end as number) ?? 0) * 1000,
        ),
        cancelAtPeriodEnd: (sub?.cancel_at_period_end as boolean) ?? false,
      },
      ['stripeSubscriptionId'],
    );

    // Update tenant plan
    await this.tenantsRepo.update(tenant.id, { plan: newPlan });

    // Rebuild feature flags
    await this.rebuildFeatureFlags(tenant.id, newPlan);

    // Update billing event
    await this.billingEventsRepo.update(
      { stripeEventId: event.id },
      { tenantId: tenant.id },
    );

    this.logger.log(
      `Subscription updated: tenant=${tenant.slug}, plan=${newPlan}`,
    );
  }

  private async handleSubscriptionDeleted(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const sub = event.data?.object as Record<string, unknown>;
    const customerId = sub?.customer as string;
    const tenant = await this.tenantsRepo.findOne({
      where: { stripeCustomerId: customerId },
    });
    if (!tenant) return;

    await this.subscriptionsRepo.update(
      { stripeSubscriptionId: sub?.id as string },
      { status: 'canceled' },
    );

    this.logger.log(`Subscription deleted: tenant=${tenant.slug}`);
  }

  private async handlePaymentSucceeded(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const invoice = event.data?.object as Record<string, unknown>;
    const customerId = invoice?.customer as string;
    const tenant = await this.tenantsRepo.findOne({
      where: { stripeCustomerId: customerId },
    });
    if (!tenant) return;

    // Clear suspension if any
    if (tenant.status === TenantStatus.SUSPENDED) {
      await this.tenantsRepo.update(tenant.id, {
        status: TenantStatus.ACTIVE,
        suspendedAt: null,
      });
      await this.cache.del(`tenant:${tenant.id}`);
      this.logger.log(`Payment succeeded → reactivated: tenant=${tenant.slug}`);
    }
  }

  private async handlePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    const invoice = event.data?.object as Record<string, unknown>;
    const customerId = invoice?.customer as string;
    const tenant = await this.tenantsRepo.findOne({
      where: { stripeCustomerId: customerId },
    });
    if (!tenant) return;

    const attemptCount = (invoice?.attempt_count as number) ?? 1;

    if (attemptCount >= 3) {
      // 3rd failure: suspend tenant
      await this.tenantsRepo.update(tenant.id, {
        status: TenantStatus.SUSPENDED,
        suspendedAt: new Date(),
      });
      await this.cache.del(`tenant:${tenant.id}`);
      this.logger.warn(
        `Payment failed (attempt ${attemptCount}) → SUSPENDED: tenant=${tenant.slug}`,
      );
    } else {
      this.logger.warn(
        `Payment failed (attempt ${attemptCount}): tenant=${tenant.slug}`,
      );
    }
  }

  /** Rebuild feature flags for a plan change and re-cache in Redis. */
  private async rebuildFeatureFlags(
    tenantId: string,
    newPlan: Plan,
  ): Promise<void> {
    // Delete plan-derived flags (keep overrides)
    await this.featureFlagsRepo.delete({
      tenantId,
      source: 'plan',
    });

    // Seed new flags
    await this.provisioningService.seedFeatureFlags(tenantId, newPlan);

    // Invalidate and re-cache
    await this.cache.del(`featureFlags:${tenantId}`);
    await this.cache.del(`tenant:${tenantId}`);
    await this.provisioningService.cacheFeatureFlags(tenantId);

    this.logger.log(
      `Feature flags rebuilt: tenant=${tenantId}, plan=${newPlan}`,
    );
  }
}
