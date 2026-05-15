/**
 * @RequireFeature() decorator — attaches feature metadata for FeatureGuard.
 * P5: See docs/5/05-tenant-middleware.md §2
 *
 * Usage:
 *   @RequireFeature(Feature.TELEMEDICINE)
 *   @Post()
 *   create() { ... }
 */
import { Feature } from '@/common/types/feature.enum';
import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'required_feature';
export const RequireFeature = (feature: Feature) =>
  SetMetadata(FEATURE_KEY, feature);
