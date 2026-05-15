/**
 * BillingModule — Stripe billing integration.
 * P5: See docs/5/06-billing-and-stripe.md
 */
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingEvent } from './entities/billing-event.entity';
import { Subscription } from './entities/subscription.entity';
import { UsageSnapshot } from './entities/usage-snapshot.entity';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { UsageController } from './usage.controller';
import { FeatureFlag } from '@/modules/tenants/entities/feature-flag.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Subscription,
      BillingEvent,
      UsageSnapshot,
      FeatureFlag,
    ]),
    TenantsModule,
  ],
  controllers: [BillingController, StripeWebhookController, UsageController],
  providers: [BillingService, StripeWebhookService],
  exports: [BillingService],
})
export class BillingModule {}
