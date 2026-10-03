import { PlanEnforcerMiddleware } from './plan-enforcer.middleware';
import { CacheService } from '@/common/cache/cache.service';
import { TenantContextService } from '@/common/context/tenant-context.service';
import { Plan } from '@/common/types/plan.enum';
import { HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { vi } from 'vitest';

describe('PlanEnforcerMiddleware', () => {
  const tenantCtx = {
    isAvailable: vi.fn(),
    get: vi.fn(),
  };
  const cache = { get: vi.fn() };
  const next = vi.fn();
  let middleware: PlanEnforcerMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    tenantCtx.isAvailable.mockReturnValue(true);
    tenantCtx.get.mockReturnValue({ tenantId: 'tenant-1', plan: Plan.BASIC });
    cache.get.mockResolvedValue(0);
    middleware = new PlanEnforcerMiddleware(
      tenantCtx as unknown as TenantContextService,
      cache as unknown as CacheService,
    );
  });

  it('skips non-POST requests', async () => {
    await middleware.use(makeRequest('GET', '/bookings'), {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('skips requests without tenant context', async () => {
    tenantCtx.isAvailable.mockReturnValueOnce(false);

    await middleware.use(
      makeRequest('POST', '/bookings'),
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });

  it('allows booking writes below the monthly limit', async () => {
    cache.get.mockResolvedValueOnce(199);

    await middleware.use(
      makeRequest('POST', '/bookings'),
      {} as Response,
      next,
    );

    expect(cache.get).toHaveBeenCalledWith('bookings:month:tenant-1');
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects booking writes at the monthly limit', async () => {
    cache.get.mockResolvedValue(200);

    try {
      await middleware.use(
        makeRequest('POST', '/bookings'),
        {} as Response,
        next,
      );
      throw new Error('Expected PlanEnforcerMiddleware to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({
          code: 'QUOTA_EXCEEDED',
          resource: 'bookings_per_month',
          limit: 200,
          upgradeUrl: '/billing/upgrade',
        }),
      );
    }
  });

  it('allows enterprise tenants with unlimited booking quota', async () => {
    tenantCtx.get.mockReturnValueOnce({
      tenantId: 'tenant-1',
      plan: Plan.ENTERPRISE,
    });

    await middleware.use(
      makeRequest('POST', '/bookings'),
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});

function makeRequest(method: string, path: string): Request {
  return { method, path } as Request;
}
