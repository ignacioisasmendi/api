import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { PLAN_LIMITS, PlanFeatureKey } from '../plan-limits.config';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Check if a feature requirement is set on handler or class
    const feature = this.reflector.getAllAndOverride<PlanFeatureKey | undefined>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature requirement — allow
    if (!feature) {
      return true;
    }

    const user = this.cls.get('user');
    if (!user) {
      // No user in context — let Auth0Guard handle the 401
      return true;
    }

    const planLimits = PLAN_LIMITS[user.plan];
    if (!planLimits) {
      throw new ForbiddenException('Unknown plan');
    }

    const hasFeature = planLimits.features[feature];
    if (!hasFeature) {
      throw new ForbiddenException(
        `The "${feature}" feature is not available on your ${user.plan} plan. Please upgrade to access this feature.`,
      );
    }

    return true;
  }
}
