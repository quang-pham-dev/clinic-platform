/**
 * BillingController — tenant billing management endpoints.
 * All routes require auth (admin role) and go through TenantMiddleware.
 * P5: See docs/5/04-api-specification.md §3
 */
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Subscription } from './entities/subscription.entity';
import { CacheService } from '@/common/cache/cache.service';
import { TenantContextService } from '@/common/context/tenant-context.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { Plan } from '@/common/types/plan.enum';
import { Role } from '@/common/types/role.enum';
import { PLAN_LIMITS } from '@clinic-platform/types';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly tenantCtx: TenantContextService,
    private readonly cache: CacheService,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
  ) {}

  /** GET /billing/plan — current plan + usage + features */
  @Get('plan')
  @Roles(Role.ADMIN)
  async getPlan() {
    const { tenantId, plan, featureFlags } = this.tenantCtx.get();
    const limits = PLAN_LIMITS[plan];

    // Read live usage from Redis
    const bookingsUsed =
      (await this.cache.get<number>(`bookings:month:${tenantId}`)) ?? 0;

    const subscription = await this.subscriptionsRepo.findOne({
      where: { tenantId },
    });

    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      plan,
      status: subscription?.status ?? 'pending',
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      usage: {
        bookings: {
          used: bookingsUsed,
          limit: limits.bookingsPerMonth,
          resetsAt: monthEnd.toISOString(),
        },
        doctorSeats: {
          used: subscription?.seatsDoctor ?? 0,
          limit: limits.doctorSeats,
        },
        staffSeats: {
          used: subscription?.seatsStaff ?? 0,
          limit: limits.staffSeats,
        },
      },
      features: Object.fromEntries([...featureFlags].map((f) => [f, true])),
    };
  }

  /** POST /billing/checkout — create Stripe Checkout session */
  @Post('checkout')
  @Roles(Role.ADMIN)
  async createCheckout(@Body() dto: CreateCheckoutDto) {
    const { tenantId } = this.tenantCtx.get();
    return this.billingService.createCheckoutSession(
      tenantId,
      dto.plan as Plan,
      dto.billingCycle as 'monthly' | 'annual',
      this.tenantCtx.get().tenantSlug,
    );
  }

  /** GET /billing/portal — Stripe Customer Portal URL */
  @Get('portal')
  @Roles(Role.ADMIN)
  async getPortal() {
    const { tenantId } = this.tenantCtx.get();
    return this.billingService.createPortalSession(tenantId);
  }

  /** GET /billing/invoices — list past invoices */
  @Get('invoices')
  @Roles(Role.ADMIN)
  async getInvoices() {
    const { tenantId } = this.tenantCtx.get();
    return this.billingService.getInvoices(tenantId);
  }
}
