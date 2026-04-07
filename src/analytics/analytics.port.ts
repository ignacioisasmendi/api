export const ANALYTICS_PORT = 'ANALYTICS_PORT';

export interface AnalyticsEvent {
  event: string;
  userId: string; // user.email used as distinct_id
  properties?: Record<string, unknown>;
}

export interface AnalyticsIdentity {
  userId: string; // user.email
  email?: string;
  name?: string;
  plan?: string;
  createdAt?: Date;
}

export interface AnalyticsPort {
  track(event: AnalyticsEvent): Promise<void>;
  identify(identity: AnalyticsIdentity): Promise<void>;
}
