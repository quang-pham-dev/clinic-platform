/**
 * FeatureGuard — enforces plan-based feature gating.
 * Reads @RequireFeature() metadata and checks against tenant's feature flags.
 * P5: See docs/5/05-tenant-middleware.md §2
 */
import { TenantContextService } from '@/common/context/tenant-context.service';
import { FEATURE_KEY } from '@/common/decorators/require-feature.decorator';
import { Feature } from '@/common/types/feature.enum';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantCtx: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<Feature>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature restriction on this route
    if (!requiredFeature) return true;

    // Skip if tenant context is not available (excluded routes)
    if (!this.tenantCtx.isAvailable()) return true;

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
    const proPlanFeatures = [
      Feature.STAFF_MANAGEMENT,
      Feature.SHIFT_SCHEDULING,
      Feature.TELEMEDICINE,
      Feature.SMS_NOTIFICATIONS,
      Feature.STRAPI_CMS,
      Feature.FILE_UPLOAD,
      Feature.API_ACCESS,
    ];
    const enterprisePlanFeatures = [Feature.OBSERVABILITY];

    if (enterprisePlanFeatures.includes(feature)) return 'enterprise';
    if (proPlanFeatures.includes(feature)) return 'pro';
    return 'basic';
  }
}
