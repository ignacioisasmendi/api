import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramInsightsService } from '../instagram-insights/instagram-insights.service';

// ─── Response types ────────────────────────────────────────────────────────────

export interface IgComment {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
  replies?: { data: IgReply[] };
}

export interface IgReply {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
}

export interface MediaWithComments {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
  commentsCount: number;
  comments: IgComment[];
}

// ─── Internal API shapes ───────────────────────────────────────────────────────

interface IgMediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  comments_count: number;
  comments?: { data: IgComment[] };
}

interface IgMediaListResponse {
  data: IgMediaItem[];
}

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: InstagramInsightsService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl =
      this.configService.get<string>('instagram.apiUrl') ||
      'https://graph.instagram.com/v24.0';
  }

  /**
   * Returns recent media with their comments for a given Instagram account.
   * Fetches on-demand — no DB storage, no cron.
   */
  async getComments(
    accountId: string,
    clientId: string,
  ): Promise<MediaWithComments[]> {
    const { token, platformUserId } = await this.insightsService.getValidToken(
      accountId,
      clientId,
    );

    const mediaParams = new URLSearchParams({
      fields:
        'id,caption,media_type,media_url,thumbnail_url,timestamp,comments_count',
      limit: '25',
      access_token: token,
    });

    const mediaList = await this.callApi<IgMediaListResponse>(
      `${this.apiUrl}/${platformUserId}/media`,
      mediaParams,
      'getMediaList',
    );

    const withComments = mediaList.data.filter((m) => m.comments_count > 0);

    const tasks = withComments.map(
      (item) => () =>
        this.fetchComments(item.id, token).then(
          (comments): MediaWithComments => ({
            id: item.id,
            caption: item.caption ?? '',
            mediaType: item.media_type,
            mediaUrl: item.media_url ?? '',
            thumbnailUrl: item.thumbnail_url,
            timestamp: item.timestamp,
            commentsCount: item.comments_count,
            comments,
          }),
        ),
    );

    const results = await this.runConcurrently(tasks, 5);

    // Sort by most recent comment timestamp
    return results.sort((a, b) => {
      const latestA = a.comments[0]?.timestamp ?? a.timestamp;
      const latestB = b.comments[0]?.timestamp ?? b.timestamp;
      return latestB.localeCompare(latestA);
    });
  }

  /**
   * Posts a reply to an Instagram comment.
   */
  async replyToComment(
    commentId: string,
    accountId: string,
    clientId: string,
    message: string,
  ): Promise<void> {
    // Validate account ownership
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, clientId, isActive: true },
    });

    if (!account) {
      throw new BadRequestException(
        'Social account not found or does not belong to this client',
      );
    }

    const { token } = await this.insightsService.getValidToken(
      accountId,
      clientId,
    );

    const params = new URLSearchParams({
      message,
      access_token: token,
    });

    await this.callApi(
      `${this.apiUrl}/${commentId}/replies`,
      params,
      'replyToComment',
      'POST',
    );
  }

  /**
   * Returns the scopes/permissions granted to the stored Instagram token.
   * Useful for diagnosing missing permissions (e.g. instagram_business_manage_comments).
   * Remove this endpoint once no longer needed.
   */
  async debugToken(accountId: string, clientId: string) {
    const { token } = await this.insightsService.getValidToken(
      accountId,
      clientId,
    );
    const appId = this.configService.get<string>('instagram.appId');
    const appSecret = this.configService.get<string>('instagram.appSecret');

    const { data } = await axios.get<{
      data: {
        app_id: string;
        type: string;
        scopes: string[];
        is_valid: boolean;
      };
    }>(`https://graph.facebook.com/debug_token`, {
      params: {
        input_token: token,
        access_token: `${appId}|${appSecret}`,
      },
    });

    return data;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async fetchComments(
    mediaId: string,
    token: string,
  ): Promise<IgComment[]> {
    const params = new URLSearchParams({
      fields: 'id,text,timestamp,username,replies{id,text,timestamp,username}',
      limit: '50',
      access_token: token,
    });

    const data = await this.callApi<{ data: IgComment[] }>(
      `${this.apiUrl}/${mediaId}/comments`,
      params,
      'fetchComments',
    );

    this.logger.debug(
      { mediaId, count: data.data?.length },
      'fetchComments raw count',
    );

    return data.data ?? [];
  }

  private async runConcurrently<T>(
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

  private async callApi<T>(
    url: string,
    params: URLSearchParams,
    context: string,
    method: 'GET' | 'POST' = 'GET',
  ): Promise<T> {
    try {
      const fullUrl = `${url}?${params.toString()}`;
      const response =
        method === 'POST'
          ? await axios.post<T>(fullUrl)
          : await axios.get<T>(fullUrl);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const igError = error.response?.data?.error;
        const status = error.response?.status;
        const message = igError?.message || error.message;
        const code: number | undefined = igError?.code;

        this.logger.error(
          { status, igErrorCode: code, context },
          `Instagram API error during ${context}: ${status} — ${message}`,
        );

        if (code === 190) {
          throw new UnauthorizedException(
            'Instagram token expired, please reconnect your account',
          );
        }

        if (code === 4 || code === 32 || code === 613) {
          throw new HttpException(
            {
              error: {
                code: 'RATE_LIMIT',
                message: 'Instagram rate limit reached',
              },
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (code === 10 || code === 200) {
          throw new HttpException(
            {
              error: {
                code: 'MISSING_PERMISSIONS',
                message: 'Missing required permissions',
              },
            },
            HttpStatus.FORBIDDEN,
          );
        }

        throw new HttpException(
          { error: { code: String(code ?? 'UNKNOWN'), message } },
          status ?? HttpStatus.BAD_GATEWAY,
        );
      }

      this.logger.error(
        { err: error, context },
        `Unexpected error during ${context}`,
      );
      throw error;
    }
  }
}
