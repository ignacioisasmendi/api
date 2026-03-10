import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { InsightsPeriod } from './dto/account-insights-query.dto';
import { EncryptionService } from '../shared/encryption/encryption.service';

// ─── Response types ────────────────────────────────────────────────────────────

export interface AccountInsightsResponse {
  impressions: number;
  reach: number;
  profileViews: number;
  followerCount: number;
  period: InsightsPeriod;
}

export interface MediaInsightsResponse {
  mediaId: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  saved: number;
  shares: number;
  videoViews?: number;
}

export interface MediaItem {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  timestamp: string;
  insights: Omit<MediaInsightsResponse, 'mediaId'>;
}

export interface MediaWithInsightsResponse {
  data: MediaItem[];
}

export interface IgProfileResponse {
  followers: number;
  following: number;
  mediaCount: number;
  username: string;
  profilePictureUrl?: string;
}

export interface MediaListItem {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
}

export interface MediaListResponse {
  data: MediaListItem[];
}

// ─── Internal types ────────────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

interface IgInsightValue {
  value: number;
  end_time: string;
}

interface IgInsightMetric {
  name: string;
  period: string;
  values: IgInsightValue[];
  title: string;
}

interface IgInsightsApiResponse {
  data: IgInsightMetric[];
}

interface IgMediaApiItem {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string; // FEED | REEL | STORY | AD
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
}

// Metrics vary by media_product_type and API version/capabilities.
const FEED_METRICS = 'impressions,reach,saved,likes,comments,shares';
const FEED_METRICS_VIEWS = 'views,reach,saved,likes,comments,shares';
const REEL_METRICS = 'plays,reach,saved,likes,comments,shares';

interface IgMediaApiResponse {
  data: IgMediaApiItem[];
}

@Injectable()
export class InstagramInsightsService {
  private readonly logger = new Logger(InstagramInsightsService.name);

  private readonly apiUrl: string;

  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.apiUrl =
      this.configService.get<string>('instagram.apiUrl') ||
      'https://graph.instagram.com/v24.0';
  }

  // ─── Token handling ──────────────────────────────────────────────────────────

  /**
   * Fetches the social account, verifies ownership via clientId, and refreshes
   * the token if it is within 24 hours of expiry.
   */
  async getValidToken(
    accountId: string,
    clientId: string,
  ): Promise<{ token: string; platformUserId: string }> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        clientId,
        platform: Platform.INSTAGRAM,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Instagram account not found or not accessible`,
      );
    }

    if (!account.accessToken || !account.platformUserId) {
      throw new UnauthorizedException(
        'Instagram account is missing credentials, please reconnect',
      );
    }

    const plainToken = this.encryptionService.decrypt(account.accessToken)!;

    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const isNearExpiry =
      account.expiresAt && account.expiresAt <= twentyFourHoursFromNow;

    if (isNearExpiry) {
      this.logger.log(
        `Token for account ${accountId} is near expiry, refreshing`,
      );
      const refreshed = await this.refreshToken(account.id, plainToken);
      return { token: refreshed, platformUserId: account.platformUserId };
    }

    return {
      token: plainToken,
      platformUserId: account.platformUserId,
    };
  }

  /**
   * Refreshes an Instagram long-lived token and persists the new one to DB.
   */
  private async refreshToken(
    accountId: string,
    currentToken: string,
  ): Promise<string> {
    try {
      const params = new URLSearchParams({
        grant_type: 'ig_refresh_token',
        access_token: currentToken,
      });

      const response = await axios.get(
        `${this.apiUrl}/refresh_access_token?${params.toString()}`,
      );

      const { access_token, expires_in } = response.data as {
        access_token: string;
        expires_in: number;
      };

      const newExpiresAt = new Date(Date.now() + expires_in * 1000);

      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: this.encryptionService.encrypt(access_token),
          expiresAt: newExpiresAt,
        },
      });

      this.logger.log(`Token refreshed for account ${accountId}`);
      return access_token;
    } catch (error) {
      this.logger.error(
        { err: error, accountId },
        'Failed to refresh Instagram token',
      );
      throw new UnauthorizedException(
        'Instagram token expired, please reconnect your account',
      );
    }
  }

  // ─── Account insights ────────────────────────────────────────────────────────

  /**
   * Fetches account-level insights (impressions, reach, profile_views,
   * follower_count) for the given period, aggregated across all days.
   */
  async getAccountInsights(
    accountId: string,
    clientId: string,
    period: InsightsPeriod,
  ): Promise<AccountInsightsResponse> {
    const cacheKey = `account:${accountId}:${period}`;
    const cached = this.getCached<AccountInsightsResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for account insights ${cacheKey}`);
      return cached;
    }

    const { token, platformUserId } = await this.getValidToken(
      accountId,
      clientId,
    );

    const days = period === '7d' ? 7 : 30;
    const until = Math.floor(Date.now() / 1000);
    const since = until - days * 24 * 60 * 60;

    const params = new URLSearchParams({
      metric: 'views,reach,profile_views,follower_count',
      period: 'day',
      since: String(since),
      until: String(until),
      access_token: token,
    });

    const data = await this.callInstagramApi<IgInsightsApiResponse>(
      `${this.apiUrl}/${platformUserId}/insights`,
      params,
      'getAccountInsights',
    );

    const result: AccountInsightsResponse = {
      impressions: 0,
      reach: 0,
      profileViews: 0,
      followerCount: 0,
      period,
    };

    for (const metric of data.data) {
      const total = metric.values.reduce((sum, v) => sum + (v.value || 0), 0);
      switch (metric.name) {
        case 'views': // renamed from 'impressions' in newer API versions
          result.impressions = total;
          break;
        case 'reach':
          result.reach = total;
          break;
        case 'profile_views':
          result.profileViews = total;
          break;
        case 'follower_count':
          // follower_count is a snapshot, take the last value
          result.followerCount =
            metric.values[metric.values.length - 1]?.value ?? total;
          break;
      }
    }

    this.setCached(cacheKey, result);
    return result;
  }

  // ─── Media insights ──────────────────────────────────────────────────────────

  /**
   * Fetches post-level insights for a single media item.
   * Attempts to fetch video_views separately — silently omits it for non-video media.
   */
  async getMediaInsights(
    accountId: string,
    clientId: string,
    mediaId: string,
  ): Promise<MediaInsightsResponse> {
    const cacheKey = `media:${accountId}:${mediaId}`;
    const cached = this.getCached<MediaInsightsResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for media insights ${cacheKey}`);
      return cached;
    }

    const { token } = await this.getValidToken(accountId, clientId);
    const result = await this.fetchMediaInsights(mediaId, token);

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Fetches the account's public profile stats (followers, following, post count).
   * Requires only the instagram_basic permission.
   */
  async getProfile(
    accountId: string,
    clientId: string,
  ): Promise<IgProfileResponse> {
    const cacheKey = `profile:${accountId}`;
    const cached = this.getCached<IgProfileResponse>(cacheKey);
    if (cached) return cached;

    const { token, platformUserId } = await this.getValidToken(accountId, clientId);

    const params = new URLSearchParams({
      fields: 'id,username,followers_count,follows_count,media_count,profile_picture_url',
      access_token: token,
    });

    const data = await this.callInstagramApi<{
      id: string;
      username: string;
      followers_count: number;
      follows_count: number;
      media_count: number;
      profile_picture_url?: string;
    }>(`${this.apiUrl}/${platformUserId}`, params, 'getProfile');

    const result: IgProfileResponse = {
      followers: data.followers_count ?? 0,
      following: data.follows_count ?? 0,
      mediaCount: data.media_count ?? 0,
      username: data.username,
      profilePictureUrl: data.profile_picture_url,
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Fetches the last 25 media items for the account (URLs only, no insights).
   * Requires only the basic instagram_basic permission.
   */
  async getMedia(
    accountId: string,
    clientId: string,
  ): Promise<MediaListResponse> {
    const cacheKey = `media:${accountId}`;
    const cached = this.getCached<MediaListResponse>(cacheKey);
    if (cached) return cached;

    const { token, platformUserId } = await this.getValidToken(accountId, clientId);

    const params = new URLSearchParams({
      fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp',
      limit: '25',
      access_token: token,
    });

    const mediaList = await this.callInstagramApi<IgMediaApiResponse>(
      `${this.apiUrl}/${platformUserId}/media`,
      params,
      'getMedia',
    );

    const result: MediaListResponse = {
      data: mediaList.data.map((item) => ({
        id: item.id,
        caption: item.caption ?? '',
        mediaType: item.media_type,
        mediaUrl: item.media_url ?? '',
        thumbnailUrl: item.thumbnail_url,
        timestamp: item.timestamp,
      })),
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Fetches the last 25 media items for the account and attaches insights to each.
   * Uses a concurrency limit of 5 to avoid Instagram rate limits.
   */
  async getMediaWithInsights(
    accountId: string,
    clientId: string,
  ): Promise<MediaWithInsightsResponse> {
    const cacheKey = `media-with-insights:${accountId}`;
    const cached = this.getCached<MediaWithInsightsResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for media-with-insights ${cacheKey}`);
      return cached;
    }

    const { token, platformUserId } = await this.getValidToken(
      accountId,
      clientId,
    );

    const mediaParams = new URLSearchParams({
      fields: 'id,caption,media_type,media_product_type,media_url,timestamp',
      limit: '25',
      access_token: token,
    });

    const mediaList = await this.callInstagramApi<IgMediaApiResponse>(
      `${this.apiUrl}/${platformUserId}/media`,
      mediaParams,
      'getMediaList',
    );

    const tasks = mediaList.data.map(
      (item) => () =>
        this.fetchMediaInsights(item.id, token, item.media_product_type).then((insights) => ({
          id: item.id,
          caption: item.caption ?? '',
          mediaType: item.media_type,
          mediaUrl: item.media_url ?? '',
          timestamp: item.timestamp,
          insights: {
            impressions: insights.impressions,
            reach: insights.reach,
            likes: insights.likes,
            comments: insights.comments,
            saved: insights.saved,
            shares: insights.shares,
            videoViews: insights.videoViews,
          },
        })),
    );

    const items = await this.withConcurrencyLimit(tasks, 5);
    const result: MediaWithInsightsResponse = { data: items };

    this.setCached(cacheKey, result);
    return result;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Fetches insights for a single media item.
   *
   * Reels use `plays` instead of `impressions` — the metric set is selected
   * based on `mediaProductType`. When the type is unknown (standalone endpoint),
   * it tries the feed metric set first and falls back to the reel set on error.
   */
  private async fetchMediaInsights(
    mediaId: string,
    token: string,
    mediaProductType?: string,
  ): Promise<MediaInsightsResponse> {
    const metricCandidates =
      mediaProductType === 'REEL'
        ? [REEL_METRICS, FEED_METRICS_VIEWS, FEED_METRICS]
        : [FEED_METRICS, FEED_METRICS_VIEWS, REEL_METRICS];

    let data: IgInsightsApiResponse | null = null;
    let lastError: unknown;

    for (const metric of metricCandidates) {
      const params = new URLSearchParams({ metric, access_token: token });
      try {
        data = await this.callInstagramApi<IgInsightsApiResponse>(
          `${this.apiUrl}/${mediaId}/insights`,
          params,
          'getMediaInsights',
        );
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!data) {
      throw lastError;
    }

    const result: MediaInsightsResponse = {
      mediaId,
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      saved: 0,
      shares: 0,
    };

    for (const metric of data.data) {
      const value = metric.values?.[0]?.value ?? 0;
      switch (metric.name) {
        case 'impressions':
        case 'views': // Some product types expose views instead of impressions
        case 'plays': // Reels use plays instead of impressions
          result.impressions = value;
          break;
        case 'reach':
          result.reach = value;
          break;
        case 'saved':
          result.saved = value;
          break;
        case 'likes':
          result.likes = value;
          break;
        case 'comments':
          result.comments = value;
          break;
        case 'shares':
          result.shares = value;
          break;
      }
    }

    // video_views is only available for VIDEO/REEL media — silently skip on error
    try {
      const videoParams = new URLSearchParams({
        metric: 'video_views',
        access_token: token,
      });
      const videoData = await this.callInstagramApi<IgInsightsApiResponse>(
        `${this.apiUrl}/${mediaId}/insights`,
        videoParams,
        'getVideoViews',
      );
      const videoMetric = videoData.data.find((m) => m.name === 'video_views');
      if (videoMetric) {
        result.videoViews = videoMetric.values?.[0]?.value ?? 0;
      }
    } catch {
      // metric not available for this media type — omit silently
    }

    return result;
  }

  /**
   * Centralized Instagram Graph API caller with structured error handling.
   * Mirrors the pattern in instagram.publisher.ts.
   */
  private async callInstagramApi<T>(
    url: string,
    params: URLSearchParams,
    context: string,
  ): Promise<T> {
    try {
      const response = await axios.get<T>(`${url}?${params.toString()}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const igError = error.response?.data?.error;
        const status = error.response?.status;
        const message = igError?.message || error.message;
        const code: number | undefined = igError?.code;
        const type: string | undefined = igError?.type;
        const fbtraceId: string | undefined = igError?.fbtrace_id;

        this.logger.error(
          { status, igErrorCode: code, igErrorType: type, igMessage: message, fbtraceId, context },
          `Instagram API error during ${context}: ${status} — ${message}`,
        );

        // Token expired
        if (code === 190) {
          throw new UnauthorizedException(
            'Instagram token expired, please reconnect your account',
          );
        }

        // Rate limit
        if (code === 4 || code === 32 || code === 613) {
          throw new HttpException(
            {
              error: {
                code: 'RATE_LIMIT',
                message: 'Instagram rate limit reached, please try again later',
              },
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        // Missing permissions
        if (code === 10 || code === 200) {
          throw new HttpException(
            {
              error: {
                code: 'MISSING_PERMISSIONS',
                message:
                  'Instagram account is missing required permissions for insights',
              },
            },
            HttpStatus.FORBIDDEN,
          );
        }

        throw new HttpException(
          {
            error: {
              code: String(code ?? 'UNKNOWN'),
              message,
            },
          },
          status ?? HttpStatus.BAD_GATEWAY,
        );
      }

      this.logger.error(
        { err: error, context },
        `Unexpected error during Instagram ${context}`,
      );
      throw error;
    }
  }

  /**
   * Runs async tasks with a maximum concurrency limit to avoid rate limits.
   */
  private async withConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number,
  ): Promise<T[]> {
    const results: T[] = [];
    let index = 0;

    async function worker() {
      while (index < tasks.length) {
        const current = index++;
        results[current] = await tasks[current]();
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
    );

    return results;
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }
}
