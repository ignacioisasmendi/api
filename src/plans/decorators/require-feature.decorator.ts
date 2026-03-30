import { SetMetadata } from '@nestjs/common';
import { PlanFeatureKey } from '../plan-limits.config';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

/**
 * Decorator to require a specific plan feature for an endpoint or controller.
 * Routes decorated with this will return 403 if the user's plan does not
 * include the specified feature.
 */
export const RequireFeature = (feature: PlanFeatureKey) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
