/**
 * UsageController — real-time usage counters from Redis.
 * P5: See docs/5/04-api-specification.md §6
 */
import { CacheService } from '@/common/cache/cache.service';
import { TenantContextService } from '@/common/context/tenant-context.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/types/role.enum';
import { PLAN_LIMITS } from '@clinic-platform/types';
import { Controller, Get } from '@nestjs/common';

@Controller('usage')
export class UsageController {
  constructor(
    private readonly tenantCtx: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  /** GET /usage/me — current tenant's real-time usage */
  @Get('me')
  @Roles(Role.ADMIN)
  async getMyUsage() {
    const { tenantId, plan } = this.tenantCtx.get();
    const limits = PLAN_LIMITS[plan];

    const bookingsUsed =
      (await this.cache.get<number>(`bookings:month:${tenantId}`)) ?? 0;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        resetsAt: resetsAt.toISOString(),
      },
      bookings: {
        used: bookingsUsed,
        limit: limits.bookingsPerMonth,
        pct:
          limits.bookingsPerMonth !== null
            ? Math.round((bookingsUsed / limits.bookingsPerMonth) * 100)
            : 0,
      },
      doctorSeats: {
        used: 0, // TODO: read from DB in Sprint 3
        limit: limits.doctorSeats,
        pct: 0,
      },
      staffSeats: {
        used: 0, // TODO: read from DB in Sprint 3
        limit: limits.staffSeats,
        pct: 0,
      },
    };
  }
}
