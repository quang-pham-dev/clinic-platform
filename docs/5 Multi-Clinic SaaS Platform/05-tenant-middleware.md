# Tenant Middleware & Isolation
### P5: Multi-Clinic SaaS Platform

> **Document type:** Technical Design — Core Tenancy Layer
> **Version:** 1.0.0

---

## 1. TenantMiddleware — Full Implementation

This is the most critical component in P5. It runs on every request, resolves the tenant, sets the DB `search_path`, and populates `AsyncLocalStorage`.

```typescript
// common/middleware/tenant.middleware.ts
import { Injectable, NestMiddleware, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../context/tenant.context';
import { RedisService } from '../redis/redis.service';
import { TenantsRepository } from '../../modules/tenants/tenants.repository';
import { TenantStatus } from '../types/tenant-status.enum';

@Injectable()
export class TenantMiddleware implements NestMiddleware {

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantCtx: TenantContextService,
    private readonly redis: RedisService,
    private readonly tenantsRepo: TenantsRepository,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new UnauthorizedException({ code: 'TENANT_MISSING' });
    }

    // 1. Load tenant (Redis first, DB fallback)
    const tenant = await this.resolveTenant(tenantId);

    // 2. Guard: block suspended tenants
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ServiceUnavailableException({
        code: 'TENANT_SUSPENDED',
        message: 'This clinic account has been suspended. Please contact support.',
      });
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ServiceUnavailableException({ code: 'TENANT_NOT_ACTIVE' });
    }

    // 3. Load feature flags (Redis — must be cached at this point)
    const featureFlags = await this.resolveFeatureFlags(tenantId);

    // 4. Set PostgreSQL search_path for this request
    await this.dataSource.query(
      `SET search_path = "${tenant.schemaName}", public`
    );

    // 5. Store context in AsyncLocalStorage — available to all services
    this.tenantCtx.run(
      {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        plan: tenant.plan,
        featureFlags,
      },
      () => next()
    );
  }

  private async resolveTenant(tenantId: string) {
    const cacheKey = `tenant:${tenantId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const tenant = await this.tenantsRepo.findOneOrFail({ where: { id: tenantId } });

    await this.redis.set(cacheKey, JSON.stringify(tenant), 'EX', 300);  // 5-min TTL
    return tenant;
  }

  private async resolveFeatureFlags(tenantId: string): Promise<Set<string>> {
    const cached = await this.redis.get(`featureFlags:${tenantId}`);
    if (cached) {
      const flags = JSON.parse(cached) as Record<string, boolean>;
      return new Set(Object.entries(flags).filter(([, v]) => v).map(([k]) => k));
    }

    // Fallback: load from DB and cache
    const flags = await this.featureFlagsRepo.find({ where: { tenantId, enabled: true } });
    const flagMap = Object.fromEntries(flags.map(f => [f.feature, f.enabled]));
    await this.redis.set(`featureFlags:${tenantId}`, JSON.stringify(flagMap), 'EX', 3600);
    return new Set(flags.map(f => f.feature));
  }
}
```

### Registering the middleware globally

```typescript
// app.module.ts
@Module({ ... })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'billing/webhook', method: RequestMethod.POST },  // Stripe sends no tenant header
        { path: 'super/(.*)', method: RequestMethod.ALL },        // Super admin bypasses tenancy
      )
      .forRoutes('*');
  }
}
```

---

## 2. FeatureGuard — Plan-Based Route Gating

### Feature enum

```typescript
// common/types/feature.enum.ts
export enum Feature {
  BOOKING             = 'booking',
  MEDICAL_RECORDS     = 'medical_records',
  EMAIL_NOTIFICATIONS = 'email_notifications',
  STAFF_MANAGEMENT    = 'staff_management',
  SHIFT_SCHEDULING    = 'shift_scheduling',
  TELEMEDICINE        = 'telemedicine',
  SMS_NOTIFICATIONS   = 'sms_notifications',
  STRAPI_CMS          = 'strapi_cms',
  FILE_UPLOAD         = 'patient_file_upload',
  API_ACCESS          = 'api_access',
  OBSERVABILITY       = 'observability_dashboard',
}
```

### Decorator

```typescript
// common/decorators/require-feature.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Feature } from '../types/feature.enum';

export const FEATURE_KEY = 'required_feature';
export const RequireFeature = (feature: Feature) =>
  SetMetadata(FEATURE_KEY, feature);
```

### Guard

```typescript
// common/guards/feature.guard.ts
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantCtx: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<Feature>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredFeature) return true;  // No feature restriction

    const { featureFlags, plan } = this.tenantCtx.get();

    if (featureFlags.has(requiredFeature)) return true;

    // Determine which plan unlocks this feature
    const requiredPlan = this.getPlanForFeature(requiredFeature);

    throw new ForbiddenException({
      code: 'PLAN_UPGRADE_REQUIRED',
      feature: requiredFeature,
      currentPlan: plan,
      requiredPlan,
      upgradeUrl: '/billing/upgrade',
    });
  }

  private getPlanForFeature(feature: Feature): string {
    const proPlan = [
      Feature.STAFF_MANAGEMENT, Feature.SHIFT_SCHEDULING,
      Feature.TELEMEDICINE, Feature.SMS_NOTIFICATIONS,
      Feature.STRAPI_CMS, Feature.FILE_UPLOAD, Feature.API_ACCESS,
    ];
    const enterprisePlan = [Feature.OBSERVABILITY];

    if (enterprisePlan.includes(feature)) return 'enterprise';
    if (proPlan.includes(feature)) return 'pro';
    return 'basic';
  }
}
```

### Usage in controllers

```typescript
// video/video.controller.ts
@Controller('video-sessions')
@UseGuards(JwtAuthGuard, FeatureGuard)   // FeatureGuard after JwtAuthGuard
export class VideoController {

  @Post()
  @RequireFeature(Feature.TELEMEDICINE)
  @Roles(Role.DOCTOR, Role.ADMIN)
  create(@Body() dto: CreateSessionDto, @CurrentUser() user: JwtPayload) {
    return this.videoService.create(dto, user);
  }
}
```

---

## 3. PlanEnforcer — Quota Enforcement Middleware

```typescript
// common/middleware/plan-enforcer.middleware.ts
@Injectable()
export class PlanEnforcerMiddleware implements NestMiddleware {

  constructor(
    private readonly redis: RedisService,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Only enforce on write operations
    if (req.method !== 'POST') return next();

    const { tenantId, plan } = this.tenantCtx.get();
    const limits = PLAN_LIMITS[plan];

    // Booking quota check
    if (req.path.endsWith('/bookings')) {
      await this.checkBookingQuota(tenantId, limits.bookingsPerMonth);
    }

    next();
  }

  private async checkBookingQuota(tenantId: string, limit: number | null): Promise<void> {
    if (limit === null) return;   // Unlimited

    const key = `bookings:month:${tenantId}`;
    const current = await this.redis.get(key);
    const used = parseInt(current ?? '0');

    if (used >= limit) {
      const now = new Date();
      const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      throw new HttpException({
        code: 'QUOTA_EXCEEDED',
        resource: 'bookings_per_month',
        limit,
        used,
        resetsAt: resetsAt.toISOString(),
        upgradeUrl: '/billing/upgrade',
      }, 429);
    }
  }
}

// Called after successful booking creation (in BookingsService):
async incrementBookingCounter(tenantId: string): Promise<void> {
  const key = `bookings:month:${tenantId}`;
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const ttl = Math.floor((monthEnd.getTime() - now.getTime()) / 1000);

  await this.redis.multi()
    .incr(key)
    .expire(key, ttl, 'NX')  // Set TTL only if key doesn't exist yet
    .exec();
}
```

### Plan limits reference

```typescript
// common/types/plan.enum.ts
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.BASIC]: {
    bookingsPerMonth: 200,
    doctorSeats: 3,
    staffSeats: 0,
  },
  [Plan.PRO]: {
    bookingsPerMonth: 1000,
    doctorSeats: 15,
    staffSeats: 50,
  },
  [Plan.ENTERPRISE]: {
    bookingsPerMonth: null,   // Unlimited
    doctorSeats: null,
    staffSeats: null,
  },
};
```

---

## 4. Seat Limit Enforcement

Doctor and staff seat limits are checked at user creation time, not per-request:

```typescript
// users.service.ts — P5 extension
async create(dto: CreateUserDto, tenantId: string): Promise<User> {
  const { plan } = this.tenantCtx.get();
  const limits = PLAN_LIMITS[plan];

  if (dto.role === Role.DOCTOR && limits.doctorSeats !== null) {
    const current = await this.usersRepo.count({
      where: { role: Role.DOCTOR, isActive: true }
      // search_path already set — counts only this tenant's doctors
    });
    if (current >= limits.doctorSeats) {
      throw new HttpException({
        code: 'SEAT_LIMIT_REACHED',
        resource: 'doctor_seats',
        limit: limits.doctorSeats,
        used: current,
        upgradeUrl: '/billing/upgrade',
      }, 422);
    }
  }

  return this.createUserTransaction(dto);
}
```

---

## 5. BullMQ Worker Tenant Context

BullMQ workers execute outside the HTTP request cycle — `AsyncLocalStorage` context is lost. Workers must explicitly set tenant context before any tenant-scoped DB operation:

```typescript
// queue/workers/email.worker.ts — P5 extension
@Processor('email-queue')
export class EmailWorker extends WorkerHost {

  async process(job: Job<EmailJobPayload>): Promise<void> {
    const { tenantId, ...rest } = job.data;

    // Re-establish tenant context for this job
    await this.withTenantContext(tenantId, async () => {
      await this.emailAdapter.send(rest);
    });
  }

  private async withTenantContext(tenantId: string, fn: () => Promise<void>): Promise<void> {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    await this.dataSource.query(`SET search_path = "${tenant.schemaName}", public`);

    const featureFlags = new Set<string>();  // Workers don't need feature flags

    await this.tenantCtx.run({ tenantId, tenantSlug: tenant.slug, plan: tenant.plan, featureFlags }, fn);
  }
}
```

**Rule:** Every BullMQ job payload must include `tenantId`. When a job is enqueued, the producer includes:

```typescript
await this.emailQueue.add('send', {
  tenantId: this.tenantCtx.tenantId,  // Captured at enqueue time from context
  ...emailPayload,
});
```

---

## 6. Feature Flag Invalidation Flow

When a Stripe plan change webhook is received, the feature flag cache must be invalidated:

```typescript
// billing/stripe-webhook.service.ts
async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const tenant = await this.tenantsRepo.findOne({
    where: { stripeCustomerId: subscription.customer as string }
  });

  const newPlan = this.stripePriceIdToPlan(subscription.items.data[0].price.id);

  // 1. Update DB
  await this.subscriptionsRepo.update(
    { stripeSubscriptionId: subscription.id },
    { plan: newPlan, status: subscription.status }
  );
  await this.tenantsRepo.update(tenant.id, { plan: newPlan });

  // 2. Rebuild feature flags for new plan
  await this.featureFlagsRepo.delete({ tenantId: tenant.id, source: 'plan' });
  await this.provisioningService.seedFeatureFlags(tenant.id, newPlan);

  // 3. Invalidate Redis caches
  await this.redis.del(`featureFlags:${tenant.id}`);
  await this.redis.del(`tenant:${tenant.id}`);

  // 4. Re-cache immediately (don't wait for next request)
  await this.provisioningService.cacheFeatureFlags(tenant.id);

  this.logger.log(`Plan updated: tenant=${tenant.slug} plan=${newPlan}`);
}
```

Target: < 5 seconds from Stripe webhook receipt to feature flag cache update in Redis.
