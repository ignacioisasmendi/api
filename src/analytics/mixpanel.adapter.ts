import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mixpanel from 'mixpanel';
import type { AnalyticsPort, AnalyticsEvent, AnalyticsIdentity } from './analytics.port';

@Injectable()
export class MixpanelAdapter implements AnalyticsPort, OnModuleInit {
  private readonly logger = new Logger(MixpanelAdapter.name);
  private client: ReturnType<typeof Mixpanel.init> | null = null;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const token = this.config.get<string>('mixpanel.token');
    this.enabled = this.config.get<boolean>('mixpanel.enabled') ?? false;

    if (!this.enabled) {
      this.logger.log('Mixpanel disabled (MIXPANEL_ENABLED != true)');
      return;
    }

    if (!token) {
      this.logger.warn(
        'Mixpanel enabled but MIXPANEL_TOKEN is not set — disabling',
      );
      this.enabled = false;
      return;
    }

    this.client = Mixpanel.init(token);
    this.logger.log('Mixpanel initialized');
  }

  async track(event: AnalyticsEvent): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      this.client.track(event.event, {
        distinct_id: event.userId,
        ...event.properties,
      });
    } catch (err) {
      this.logger.error('Mixpanel track failed', err);
    }
  }

  async identify(identity: AnalyticsIdentity): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      this.client.people.set(identity.userId, {
        $email: identity.email,
        $name: identity.name,
        plan: identity.plan,
        $created: identity.createdAt,
      });
    } catch (err) {
      this.logger.error('Mixpanel identify failed', err);
    }
  }
}
