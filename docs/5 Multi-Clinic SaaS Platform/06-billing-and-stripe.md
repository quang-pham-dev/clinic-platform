# Billing & Stripe Integration
### P5: Multi-Clinic SaaS Platform

> **Document type:** Technical Design — Billing
> **Version:** 1.0.0

---

## 1. Stripe Product & Price Setup

Before any code runs, create the following in the Stripe dashboard (or via Stripe CLI):

```
Products:
  ├── Clinic SaaS — Basic
  │   ├── Price: basic_monthly   — $29/month (recurring monthly)
  │   └── Price: basic_annual    — $23/month ($276/year, recurring yearly)
  │
  ├── Clinic SaaS — Pro
  │   ├── Price: pro_monthly     — $79/month
  │   └── Price: pro_annual      — $63/month ($756/year)
  │
  └── Clinic SaaS — Enterprise
      ├── Price: enterprise_monthly  — $199/month
      └── Price: enterprise_annual   — $159/month ($1,908/year)
```

Store Price IDs in environment:
```dotenv
STRIPE_BASIC_MONTHLY_PRICE_ID=price_xxx
STRIPE_BASIC_ANNUAL_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 2. BillingService — Core Implementation

```typescript
// billing/billing.service.ts
@Injectable()
export class BillingService {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantsRepo: Repository<Tenant>,
    private readonly subscriptionsRepo: Repository<Subscription>,
  ) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });
  }

  async createCheckoutSession(
    tenantId: string,
    plan: Plan,
    billingCycle: 'monthly' | 'annual',
    adminEmail: string,
  ): Promise<{ checkoutUrl: string }> {

    const priceId = this.getPriceId(plan, billingCycle);

    // Create or retrieve Stripe Customer
    let tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    let customerId = tenant.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: adminEmail,
        metadata: { tenantId, tenantSlug: tenant.slug },
      });
      customerId = customer.id;
      await this.tenantsRepo.update(tenantId, { stripeCustomerId: customerId });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.configService.get('FRONTEND_URL')}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/onboarding/cancelled`,
      subscription_data: {
        metadata: { tenantId },
      },
      allow_promotion_codes: true,
    });

    return { checkoutUrl: session.url };
  }

  async createPortalSession(tenantId: string): Promise<{ portalUrl: string }> {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${this.configService.get('FRONTEND_URL')}/billing`,
    });
    return { portalUrl: session.url };
  }

  private getPriceId(plan: Plan, cycle: 'monthly' | 'annual'): string {
    const key = `STRIPE_${plan.toUpperCase()}_${cycle.toUpperCase()}_PRICE_ID`;
    return this.configService.get(key);
  }

  private planFromPriceId(priceId: string): Plan {
    const map = {
      [this.configService.get('STRIPE_BASIC_MONTHLY_PRICE_ID')]:      Plan.BASIC,
      [this.configService.get('STRIPE_BASIC_ANNUAL_PRICE_ID')]:       Plan.BASIC,
      [this.configService.get('STRIPE_PRO_MONTHLY_PRICE_ID')]:        Plan.PRO,
      [this.configService.get('STRIPE_PRO_ANNUAL_PRICE_ID')]:         Plan.PRO,
      [this.configService.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID')]: Plan.ENTERPRISE,
      [this.configService.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID')]:  Plan.ENTERPRISE,
    };
    return map[priceId] ?? Plan.BASIC;
  }
}
```

---

## 3. Stripe Webhook Handler

```typescript
// billing/stripe-webhook.controller.ts
@Controller('billing/webhook')
export class StripeWebhookController {

  constructor(
    private readonly webhookService: StripeWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,                                   // Must use raw body — not parsed JSON
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET'),
      );
    } catch {
      throw new BadRequestException({ code: 'STRIPE_WEBHOOK_INVALID' });
    }

    // Always log receipt first
    await this.webhookService.logEvent(event);

    // Process asynchronously — Stripe expects 200 within 5 seconds
    setImmediate(() => this.webhookService.process(event));

    return { received: true };
  }
}
```

```typescript
// billing/stripe-webhook.service.ts
@Injectable()
export class StripeWebhookService {

  async process(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.handleCheckoutCompleted(event);
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdated(event);
      case 'customer.subscription.deleted':
        return this.handleSubscriptionDeleted(event);
      case 'invoice.payment_succeeded':
        return this.handlePaymentSucceeded(event);
      case 'invoice.payment_failed':
        return this.handlePaymentFailed(event);
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.subscription_data?.metadata?.tenantId
      || (session.metadata as any)?.tenantId;

    await this.tenantsRepo.update(tenantId, { status: TenantStatus.PROVISIONING });

    // Enqueue provisioning job (so it doesn't block webhook response)
    await this.provisioningQueue.add('provision', { tenantId });
  }

  private async handleSubscriptionUpdated(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;
    const tenant = await this.tenantsRepo.findOne({
      where: { stripeCustomerId: sub.customer as string }
    });
    if (!tenant) return;

    const newPlan = this.planFromPriceId(sub.items.data[0].price.id);

    await this.subscriptionsRepo.upsert({
      tenantId: tenant.id,
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items.data[0].price.id,
      plan: newPlan,
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    }, ['stripeSubscriptionId']);

    await this.tenantsRepo.update(tenant.id, { plan: newPlan });

    // Rebuild and re-cache feature flags
    await this.rebuildFeatureFlags(tenant.id, newPlan);
  }

  private async handlePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const tenant = await this.tenantsRepo.findOne({
      where: { stripeCustomerId: invoice.customer as string }
    });
    if (!tenant) return;

    const attemptCount = invoice.attempt_count;

    if (attemptCount === 1) {
      // First failure: send dunning email
      await this.notificationsQueue.add('email', {
        tenantId: tenant.id,
        to: tenant.adminEmail,
        eventType: 'billing.payment_failed.1',
        data: { clinicName: tenant.name },
      });
    } else if (attemptCount >= 3) {
      // Third failure: suspend tenant
      await this.tenantsRepo.update(tenant.id, {
        status: TenantStatus.SUSPENDED,
        suspendedAt: new Date(),
      });
      // Invalidate tenant cache so next request sees suspension immediately
      await this.redis.del(`tenant:${tenant.id}`);
    }
  }
}
```

---

## 4. Dunning Email Sequence

On payment failure, BullMQ sends delayed email jobs:

| Attempt | Action | Delay |
|---------|--------|-------|
| 1st failure | Email: "Payment failed — please update your card" | Immediate |
| 2nd failure (Stripe retry D+3) | Email: "Second payment failure — account at risk" | Immediate |
| 3rd failure (Stripe retry D+5) | Email: "Account suspended — contact support" | Immediate |
| — | Tenant status → `suspended` | On 3rd failure |

Stripe's automatic retry schedule (configurable in Stripe Dashboard under Revenue Recovery):
- Retry 1: Day 3
- Retry 2: Day 5
- Final failure: Day 7 → `invoice.payment_failed` with `attempt_count >= 3`

---

## 5. Seat Metering with Stripe

Pro and Enterprise plans include per-seat pricing. Seat counts are reported to Stripe monthly for accurate invoicing:

```typescript
// billing/seat-metering.service.ts
@Injectable()
export class SeatMeteringService {

  // Called by BullMQ cron job on the last day of each month
  async reportAllTenantSeats(): Promise<void> {
    const tenants = await this.tenantsRepo.find({
      where: { status: TenantStatus.ACTIVE }
    });

    for (const tenant of tenants) {
      await this.reportTenantSeats(tenant);
    }
  }

  private async reportTenantSeats(tenant: Tenant): Promise<void> {
    // Count active doctors and staff in tenant schema
    await this.dataSource.query(`SET search_path = "${tenant.schemaName}", public`);

    const doctorCount = await this.dataSource.query(
      `SELECT COUNT(*) FROM users WHERE role = 'doctor' AND is_active = true`
    );
    const staffCount = await this.dataSource.query(
      `SELECT COUNT(*) FROM users WHERE role IN ('nurse','head_nurse','receptionist') AND is_active = true`
    );

    // Update Stripe subscription quantities (for seat-based pricing)
    const subscription = await this.subscriptionsRepo.findOne({
      where: { tenantId: tenant.id }
    });

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{
        id: subscription.stripeItemId,
        quantity: parseInt(doctorCount[0].count) + parseInt(staffCount[0].count),
      }],
    });

    // Snapshot to DB for reporting
    await this.usageSnapshotsRepo.save({
      tenantId: tenant.id,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(),
      doctorsCount: parseInt(doctorCount[0].count),
      staffCount: parseInt(staffCount[0].count),
    });
  }
}
```

---

## 6. Environment Variables (P5 Stripe)

```dotenv
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx              # Never sk_test_ in production
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_BASIC_MONTHLY_PRICE_ID=price_xxx
STRIPE_BASIC_ANNUAL_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_xxx

# NestJS raw body required for Stripe webhook signature
# In main.ts: app.use('/billing/webhook', express.raw({ type: 'application/json' }))
```
