/**
 * BillingService — Stripe API integration.
 * P5: See docs/5/06-billing-and-stripe.md §2
 *
 * Stripe v22 uses class-based instantiation. Types are imported
 * from the stripe package directly (not as Stripe.X namespace).
 */
import { Plan } from '@/common/types/plan.enum';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';

@Injectable()
export class BillingService {
  private readonly stripe: InstanceType<typeof Stripe>;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('stripe.secretKey', ''),
    );
  }

  async createCheckoutSession(
    tenantId: string,
    plan: Plan,
    billingCycle: 'monthly' | 'annual',
    adminEmail: string,
  ): Promise<{ checkoutUrl: string }> {
    const priceId = this.getPriceId(plan, billingCycle);

    // Create or retrieve Stripe Customer
    const tenant = await this.tenantsRepo.findOneOrFail({
      where: { id: tenantId },
    });
    let customerId = tenant.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: adminEmail,
        metadata: { tenantId, tenantSlug: tenant.slug },
      });
      customerId = customer.id;
      await this.tenantsRepo.update(tenantId, {
        stripeCustomerId: customerId,
      });
    }

    const frontendUrl = this.configService.get<string>(
      'stripe.frontendUrl',
      'http://localhost:3000',
    );

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/onboarding/cancelled`,
      subscription_data: {
        metadata: { tenantId },
      },
      allow_promotion_codes: true,
    });

    this.logger.log(
      `Checkout session created: tenant=${tenant.slug}, plan=${plan}, cycle=${billingCycle}`,
    );

    return { checkoutUrl: session.url! };
  }

  async createPortalSession(tenantId: string): Promise<{ portalUrl: string }> {
    const tenant = await this.tenantsRepo.findOneOrFail({
      where: { id: tenantId },
    });

    const frontendUrl = this.configService.get<string>(
      'stripe.frontendUrl',
      'http://localhost:3000',
    );

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId!,
      return_url: `${frontendUrl}/billing`,
    });

    return { portalUrl: session.url };
  }

  async getInvoices(tenantId: string) {
    const tenant = await this.tenantsRepo.findOneOrFail({
      where: { id: tenantId },
    });

    if (!tenant.stripeCustomerId) {
      return { data: [] };
    }

    const invoices = await this.stripe.invoices.list({
      customer: tenant.stripeCustomerId,
      limit: 20,
    });

    return { data: invoices.data };
  }

  getPriceId(plan: Plan, cycle: 'monthly' | 'annual'): string {
    const key = `stripe.prices.${plan}${cycle === 'monthly' ? 'Monthly' : 'Annual'}`;
    return this.configService.get<string>(key, '');
  }

  planFromPriceId(priceId: string): Plan {
    const config = this.configService.get('stripe.prices');
    const map: Record<string, Plan> = {
      [config.basicMonthly]: Plan.BASIC,
      [config.basicAnnual]: Plan.BASIC,
      [config.proMonthly]: Plan.PRO,
      [config.proAnnual]: Plan.PRO,
      [config.enterpriseMonthly]: Plan.ENTERPRISE,
      [config.enterpriseAnnual]: Plan.ENTERPRISE,
    };
    return map[priceId] ?? Plan.BASIC;
  }
}
