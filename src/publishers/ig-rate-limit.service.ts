import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AccountUsage {
  callCount: number;
  totalCpuTime: number;
  totalTime: number;
  throttledUntil?: Date;
}

// Shape of each entry in the X-Business-Use-Case-Usage header value array
interface BucUsageEntry {
  call_count: number;
  total_cputime: number;
  total_time: number;
  type: string;
  estimated_time_to_regain_access: number;
}

@Injectable()
export class IgRateLimitService {
  private readonly logger = new Logger(IgRateLimitService.name);
  private readonly usageMap = new Map<string, AccountUsage>();
  private readonly threshold: number;

  constructor(private readonly configService: ConfigService) {
    this.threshold = this.configService.get<number>(
      'instagram.rateLimitThreshold',
    )!;
  }

  /**
   * Parse and store usage data from the X-Business-Use-Case-Usage response header.
   * Header value is a JSON string like:
   * { "instagram_graph_api": [{ "call_count": 28, "total_cputime": 12, "total_time": 20, ... }] }
   */
  updateFromHeader(platformUserId: string, headerValue: string): void {
    try {
      const parsed = JSON.parse(headerValue) as Record<
        string,
        BucUsageEntry[]
      >;

      // The key is typically 'instagram_graph_api' but we take the first entry found
      const entries = Object.values(parsed).flat();
      if (!entries.length) return;

      const entry = entries[0];
      const current = this.usageMap.get(platformUserId) ?? {
        callCount: 0,
        totalCpuTime: 0,
        totalTime: 0,
      };

      const updated: AccountUsage = {
        ...current,
        callCount: entry.call_count ?? 0,
        totalCpuTime: entry.total_cputime ?? 0,
        totalTime: entry.total_time ?? 0,
      };

      this.usageMap.set(platformUserId, updated);

      this.logger.debug(
        {
          platformUserId,
          callCount: updated.callCount,
          totalCpuTime: updated.totalCpuTime,
          totalTime: updated.totalTime,
        },
        `Instagram API usage for account ${platformUserId}`,
      );
    } catch {
      this.logger.warn(
        `Failed to parse X-Business-Use-Case-Usage header for account ${platformUserId}`,
      );
    }
  }

  /**
   * Mark an account as throttled until the estimated recovery time elapses.
   * Called when error code 80002 or 80006 is received.
   */
  setThrottled(platformUserId: string, estimatedMinutes: number): void {
    const recoveryMinutes = estimatedMinutes > 0 ? estimatedMinutes : 60;
    const throttledUntil = new Date(Date.now() + recoveryMinutes * 60_000);

    const current = this.usageMap.get(platformUserId) ?? {
      callCount: 100,
      totalCpuTime: 100,
      totalTime: 100,
    };

    this.usageMap.set(platformUserId, { ...current, throttledUntil });

    this.logger.warn(
      { platformUserId, throttledUntil },
      `Account ${platformUserId} throttled until ${throttledUntil.toISOString()}`,
    );
  }

  /**
   * Returns true if:
   * - The account has an active throttledUntil in the future, OR
   * - Any usage metric (callCount, totalCpuTime, totalTime) is at or above the threshold
   */
  isThrottled(platformUserId: string): boolean {
    const usage = this.usageMap.get(platformUserId);
    if (!usage) return false;

    if (usage.throttledUntil && usage.throttledUntil > new Date()) {
      return true;
    }

    return (
      usage.callCount >= this.threshold ||
      usage.totalCpuTime >= this.threshold ||
      usage.totalTime >= this.threshold
    );
  }

  /**
   * Returns current usage snapshot for a given account (for logging/debugging).
   */
  getUsage(platformUserId: string): AccountUsage | undefined {
    return this.usageMap.get(platformUserId);
  }

  /**
   * Returns the estimated recovery time in ms for a throttled account.
   */
  getThrottledUntilMs(platformUserId: string): number {
    const usage = this.usageMap.get(platformUserId);
    if (!usage?.throttledUntil) return 0;
    return Math.max(0, usage.throttledUntil.getTime() - Date.now());
  }
}
