import { FeatureGuard } from './feature.guard';
import { TenantContextService } from '@/common/context/tenant-context.service';
import { Feature } from '@/common/types/feature.enum';
import { Plan } from '@/common/types/plan.enum';
import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';

describe('FeatureGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const tenantCtx = {
    isAvailable: vi.fn(),
    get: vi.fn(),
  };
  let guard: FeatureGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(undefined);
    tenantCtx.isAvailable.mockReturnValue(true);
    tenantCtx.get.mockReturnValue({
      plan: Plan.BASIC,
      featureFlags: new Set([Feature.BOOKING]),
    });
    guard = new FeatureGuard(
      reflector as unknown as Reflector,
      tenantCtx as unknown as TenantContextService,
    );
  });

  it('allows routes without required feature metadata', () => {
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows excluded routes when tenant context is unavailable', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(Feature.FILE_UPLOAD);
    tenantCtx.isAvailable.mockReturnValueOnce(false);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows enabled features', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(Feature.BOOKING);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('throws upgrade details for disabled features', () => {
    reflector.getAllAndOverride.mockReturnValue(Feature.FILE_UPLOAD);

    try {
      guard.canActivate(makeContext());
      throw new Error('Expected FeatureGuard to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'PLAN_UPGRADE_REQUIRED',
        feature: Feature.FILE_UPLOAD,
        currentPlan: Plan.BASIC,
        requiredPlan: 'pro',
        upgradeUrl: '/billing/upgrade',
      });
    }
  });
});

function makeContext(): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
  } as unknown as ExecutionContext;
}
