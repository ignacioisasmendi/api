import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ContentFormat } from '@prisma/client';
import {
  IPlatformPublisher,
  PublicationWithRelations,
  ValidationResult,
  PrepareResult,
  PublishResult,
} from './interfaces/platform-publisher.interface';

@Injectable()
export class InstagramPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(InstagramPublisher.name);
  private static readonly POLLING_INTERVAL_MS = 2000;

  private readonly apiUrl: string;
  private readonly mediaProcessingWaitTime: number;
  private readonly videoProcessingWaitTime: number;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('instagram.apiUrl')!;
    this.mediaProcessingWaitTime = this.configService.get<number>(
      'instagram.mediaProcessingWaitTime',
    )!;
    this.videoProcessingWaitTime = this.configService.get<number>(
      'instagram.videoProcessingWaitTime',
    )!;
  }

  async validatePayload(
    _payload: Record<string, unknown>,
    _format: string,
  ): Promise<ValidationResult> {
    return { isValid: true };
  }

  /**
   * Phase 1: Creates the media container and waits for processing.
   * Called ~5 minutes before publishAt so the container is ready in time.
   */
  async prepare(
    publication: PublicationWithRelations,
  ): Promise<PrepareResult> {
    try {
      this.logger.log(`Preparing Instagram container for: ${publication.id}`);

      if (!publication.mediaUsage.length) {
        return {
          success: false,
          message: 'No media found for publication',
          error: 'Publication must have at least one media file',
        };
      }

      let containerId: string;

      switch (publication.format) {
        case ContentFormat.FEED:
          containerId = await this.createFeedContainer(publication);
          break;
        case ContentFormat.STORY:
          containerId = await this.createStoryContainer(publication);
          break;
        case ContentFormat.REEL:
          containerId = await this.createReelContainer(publication);
          break;
        case ContentFormat.CAROUSEL:
          containerId = await this.createCarouselContainer(publication);
          break;
        default:
          return {
            success: false,
            message: 'Unsupported format',
            error: `Format ${publication.format} is not supported for Instagram`,
          };
      }

      this.logger.log(
        `Container ${containerId} ready for publication ${publication.id}`,
      );

      return {
        success: true,
        containerId,
        message: 'Instagram container created and ready for publishing',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { err: error, publicationId: publication.id },
        `Failed to prepare Instagram container: ${errorMessage}`,
      );
      return {
        success: false,
        message: 'Failed to prepare Instagram container',
        error: errorMessage,
      };
    }
  }

  /**
   * Phase 2: Publishes a previously prepared container.
   * If containerId is set, it calls media_publish directly (~1 second).
   * If not (fallback), it runs the full create → poll → publish flow.
   */
  async publish(publication: PublicationWithRelations): Promise<PublishResult> {
    try {
      this.logger.log(`Publishing to Instagram: ${publication.id}`);

      const socialAccount = publication.socialAccount;

      // Fast path: container was pre-created by prepare()
      if (publication.containerId) {
        this.logger.log(
          `Using pre-created container ${publication.containerId} for publication ${publication.id}`,
        );

        const publishedMediaId = await this.publishMedia(
          publication.containerId,
          socialAccount.platformUserId!,
          socialAccount.accessToken!,
        );

        return {
          success: true,
          platformId: publishedMediaId,
          link: this.buildLink(publication.format, publishedMediaId),
          message: `${publication.format} published successfully to Instagram`,
        };
      }

      // Fallback: no container prepared — run full flow
      this.logger.warn(
        `No pre-created container for ${publication.id}, running full publish flow`,
      );

      if (!publication.mediaUsage.length) {
        return {
          success: false,
          message: 'No media found for publication',
          error: 'Publication must have at least one media file',
        };
      }

      let containerId: string;

      switch (publication.format) {
        case ContentFormat.FEED:
          containerId = await this.createFeedContainer(publication);
          break;
        case ContentFormat.STORY:
          containerId = await this.createStoryContainer(publication);
          break;
        case ContentFormat.REEL:
          containerId = await this.createReelContainer(publication);
          break;
        case ContentFormat.CAROUSEL:
          containerId = await this.createCarouselContainer(publication);
          break;
        default:
          return {
            success: false,
            message: 'Unsupported format',
            error: `Format ${publication.format} is not supported for Instagram`,
          };
      }

      const publishedMediaId = await this.publishMedia(
        containerId,
        socialAccount.platformUserId!,
        socialAccount.accessToken!,
      );

      return {
        success: true,
        platformId: publishedMediaId,
        link: this.buildLink(publication.format, publishedMediaId),
        message: `${publication.format} published successfully to Instagram`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { err: error, publicationId: publication.id },
        `Failed to publish to Instagram: ${errorMessage}`,
      );
      return {
        success: false,
        message: 'Failed to publish to Instagram',
        error: errorMessage,
      };
    }
  }

  // ─── Container creation methods ───────────────────────────────────────

  private async createFeedContainer(
    publication: PublicationWithRelations,
  ): Promise<string> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media) {
      throw new Error('Feed post requires at least one image');
    }

    const caption =
      publication.customCaption || publication.content.caption || '';

    const data = await this.callInstagramApi(
      `${this.apiUrl}/${socialAccount.platformUserId}/media`,
      new URLSearchParams({
        image_url: media.url,
        caption,
        access_token: socialAccount.accessToken!,
      }),
      'createMediaContainer',
    );

    this.logger.log(`Feed container created with ID: ${data.id}`);

    await this.waitForMediaProcessing(
      data.id,
      socialAccount.accessToken!,
      this.mediaProcessingWaitTime,
    );

    return data.id;
  }

  private async createStoryContainer(
    publication: PublicationWithRelations,
  ): Promise<string> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media) {
      throw new Error('Story requires at least one image or video');
    }

    const link = (publication.platformConfig as Record<string, unknown> | null)
      ?.link as string | undefined;

    const params = new URLSearchParams({
      image_url: media.url,
      media_type: 'STORIES',
      access_token: socialAccount.accessToken!,
    });
    if (link) params.append('link', link);

    const data = await this.callInstagramApi(
      `${this.apiUrl}/${socialAccount.platformUserId}/media`,
      params,
      'createStoryContainer',
    );

    await this.waitForMediaProcessing(
      data.id,
      socialAccount.accessToken!,
      this.mediaProcessingWaitTime,
    );

    return data.id;
  }

  private async createReelContainer(
    publication: PublicationWithRelations,
  ): Promise<string> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media || media.type !== 'VIDEO') {
      throw new Error('Reel requires a video file');
    }

    const caption =
      publication.customCaption || publication.content.caption || '';

    const params = new URLSearchParams({
      video_url: media.url,
      caption,
      media_type: 'REELS',
      access_token: socialAccount.accessToken!,
      upload_type: 'resumable',
      share_to_feed: 'true',
    });

    const data = await this.callInstagramApi(
      `${this.apiUrl}/${socialAccount.platformUserId}/media`,
      params,
      'createReelContainer',
    );

    await this.waitForMediaProcessing(
      data.id,
      socialAccount.accessToken!,
      this.videoProcessingWaitTime,
    );

    return data.id;
  }

  /**
   * Polls the Instagram container status until it reaches FINISHED or ERROR.
   * Works for all container types: image, video, story, carousel, and reel.
   */
  private async waitForMediaProcessing(
    creationId: string,
    accessToken: string,
    timeoutMs: number,
  ): Promise<void> {
    const start = Date.now();
    let attempts = 0;

    while (true) {
      attempts++;

      const res = await this.callInstagramApi(
        `${this.apiUrl}/${creationId}`,
        new URLSearchParams({
          access_token: accessToken,
          fields: 'status_code,status',
        }),
        'checkContainerStatus',
        'GET',
      );

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      this.logger.debug({
        context: 'InstagramPublisher',
        message: '[waitForMediaProcessing] Polling container status',
        creationId,
        attempt: attempts,
        elapsedSeconds: elapsed,
        status_code: res.status_code,
        status: res.status,
      });

      if (res.status_code === 'FINISHED') {
        this.logger.debug({
          context: 'InstagramPublisher',
          message: '[waitForMediaProcessing] Media processing finished',
          creationId,
          attempts,
          totalSeconds: elapsed,
        });
        return;
      }

      if (res.status_code === 'ERROR') {
        this.logger.error({
          context: 'InstagramPublisher',
          message: '[waitForMediaProcessing] Media processing failed',
          creationId,
          attempts,
          totalSeconds: elapsed,
          status: res.status,
        });

        throw new Error(
          `Instagram media processing failed: ${res.status || 'Unknown reason'}`,
        );
      }

      if (Date.now() - start > timeoutMs) {
        this.logger.error({
          context: 'InstagramPublisher',
          message: '[waitForMediaProcessing] Timeout waiting for media processing',
          creationId,
          attempts,
          totalSeconds: elapsed,
        });

        throw new Error('Timeout waiting for Instagram media processing');
      }

      await this.delay(InstagramPublisher.POLLING_INTERVAL_MS);
    }
  }


  private async createCarouselContainer(
    publication: PublicationWithRelations,
  ): Promise<string> {
    const socialAccount = publication.socialAccount;
    const mediaItems = publication.mediaUsage;

    if (!mediaItems || mediaItems.length < 2) {
      throw new Error('Carousel requires at least 2 media items');
    }

    const caption =
      publication.customCaption || publication.content.caption || '';

    const mediaIds = await Promise.all(
      mediaItems.map(async (item, index) => {
        const params = new URLSearchParams({
          is_carousel_item: 'true',
          access_token: socialAccount.accessToken!,
        });

        const isVideo = item.media.type === 'VIDEO';
        if (isVideo) {
          params.append('video_url', item.media.url);
          params.append('media_type', 'VIDEO');
        } else {
          params.append('image_url', item.media.url);
          params.append('media_type', 'IMAGE');
        }

        const data = await this.callInstagramApi(
          `${this.apiUrl}/${socialAccount.platformUserId}/media`,
          params,
          `createCarouselItem[${index}]`,
        );

        const timeout = isVideo
          ? this.videoProcessingWaitTime
          : this.mediaProcessingWaitTime;

        await this.waitForMediaProcessing(
          data.id,
          socialAccount.accessToken!,
          timeout,
        );

        return data.id as string;
      }),
    );

    const carouselData = await this.callInstagramApi(
      `${this.apiUrl}/${socialAccount.platformUserId}/media`,
      new URLSearchParams({
        media_type: 'CAROUSEL',
        caption,
        children: mediaIds.join(','),
        access_token: socialAccount.accessToken!,
      }),
      'createCarouselContainer',
    );

    await this.waitForMediaProcessing(
      carouselData.id,
      socialAccount.accessToken!,
      this.mediaProcessingWaitTime,
    );

    return carouselData.id;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private buildLink(format: ContentFormat, platformId: string): string | undefined {
    switch (format) {
      case ContentFormat.FEED:
      case ContentFormat.CAROUSEL:
        return `https://www.instagram.com/p/${platformId}`;
      case ContentFormat.REEL:
        return `https://www.instagram.com/reel/${platformId}`;
      case ContentFormat.STORY:
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Publish a previously created media container.
   */
  private async publishMedia(
    creationId: string,
    platformUserId: string,
    accessToken: string,
  ): Promise<string> {
    this.logger.log(`Publishing media to Instagram`);

    const data = await this.callInstagramApi(
      `${this.apiUrl}/${platformUserId}/media_publish`,
      new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken,
      }),
      'publishMedia',
    );

    return data.id;
  }

  /**
   * Centralized Instagram Graph API caller with structured error handling.
   *
   * The IG Graph API returns errors in shape: { error: { message, type, code, fbtrace_id } }
   * This method extracts and logs all of those fields for full visibility.
   */
  private async callInstagramApi(
    url: string,
    params: URLSearchParams,
    context: string,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<any> {
    try {
      const response =
        method === 'GET'
          ? await axios.get(`${url}?${params.toString()}`)
          : await axios.post(url, params, {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const igError = error.response?.data?.error;
        const status = error.response?.status;
        const message = igError?.message || error.message;
        const code = igError?.code;
        const type = igError?.type;
        const fbtraceId = igError?.fbtrace_id;

        this.logger.error(
          {
            status,
            igErrorCode: code,
            igErrorType: type,
            igMessage: message,
            fbtraceId,
            context,
          },
          `Instagram API error during ${context}: ${status} — ${message}`,
        );

        throw new Error(
          `Instagram ${context} failed: ${message} (HTTP ${status}, code: ${code || 'N/A'})`,
        );
      }

      this.logger.error(
        { err: error, context },
        `Unexpected error during Instagram ${context}`,
      );
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
