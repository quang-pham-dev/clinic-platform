/**
 * PlanEnforcerMiddleware — enforces quota limits using Redis counters.
 * P5: See docs/5/05-tenant-middleware.md §3
 *
 * Checks booking quotas on POST /bookings.
 * Runs after TenantMiddleware sets tenant context.
 */
import { CacheService } from '@/common/cache/cache.service';
import { TenantContextService } from '@/common/context/tenant-context.service';
import { PLAN_LIMITS } from '@clinic-platform/types';
import {
  HttpException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class PlanEnforcerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PlanEnforcerMiddleware.name);

  constructor(
    private readonly tenantCtx: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Only enforce on write operations
    if (req.method !== 'POST') return next();

    // Skip if tenant context not available
    if (!this.tenantCtx.isAvailable()) return next();

    const { tenantId, plan } = this.tenantCtx.get();
    const limits = PLAN_LIMITS[plan];

    // Booking quota check
    if (req.path.endsWith('/bookings') || req.path.match(/\/bookings$/)) {
      await this.checkBookingQuota(tenantId, limits.bookingsPerMonth);
    }

    next();
  }

  private async checkBookingQuota(
    tenantId: string,
    limit: number | null,
  ): Promise<void> {
    if (limit === null) return; // Unlimited

    const key = `bookings:month:${tenantId}`;
    const current = await this.cache.get<number>(key);
    const used = current ?? 0;

    if (used >= limit) {
      const now = new Date();
      const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      throw new HttpException(
        {
          code: 'QUOTA_EXCEEDED',
          resource: 'bookings_per_month',
          limit,
          used,
          resetsAt: resetsAt.toISOString(),
          upgradeUrl: '/billing/upgrade',
        },
        429,
      );
    }
  }
}
