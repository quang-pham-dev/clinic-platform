/**
 * StripeWebhookController — receives Stripe webhook events.
 * Excluded from TenantMiddleware (Stripe sends no tenant header).
 * P5: See docs/5/06-billing-and-stripe.md §3
 */
import { StripeWebhookService } from './stripe-webhook.service';
import { Public } from '@/common/decorators/public.decorator';
import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Controller('billing/webhook')
export class StripeWebhookController {
  private readonly stripe: InstanceType<typeof Stripe>;
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly webhookService: StripeWebhookService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('stripe.secretKey', ''),
    );
  }

  @Post()
  @Public()
  async handleWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        this.configService.get<string>('stripe.webhookSecret', ''),
      );
    } catch {
      throw new BadRequestException({
        code: 'STRIPE_WEBHOOK_INVALID',
      });
    }

    // Always log receipt first
    await this.webhookService.logEvent(event);

    // Process asynchronously — Stripe expects 200 within 5 seconds
    setImmediate(() => {
      this.webhookService
        .process(event)
        .catch((err) =>
          this.logger.error(
            `Async webhook processing failed: ${(err as Error).message}`,
          ),
        );
    });

    return { received: true };
  }
}
