import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ContentFormat } from '@prisma/client';
import {
  IPlatformPublisher,
  PublicationWithRelations,
  ValidationResult,
  PublishResult,
} from './interfaces/platform-publisher.interface';

@Injectable()
export class InstagramPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(InstagramPublisher.name);
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

  async publish(publication: PublicationWithRelations): Promise<PublishResult> {
    try {
      this.logger.log(`Publishing to Instagram: ${publication.id}`);

      if (!publication.mediaUsage.length) {
        return {
          success: false,
          message: 'No media found for publication',
          error: 'Publication must have at least one media file',
        };
      }

      switch (publication.format) {
        case ContentFormat.FEED:
          return await this.publishFeed(publication);
        case ContentFormat.STORY:
          return await this.publishStory(publication);
        case ContentFormat.REEL:
          return await this.publishReel(publication);
        case ContentFormat.CAROUSEL:
          return await this.publishCarousel(publication);
        default:
          return {
            success: false,
            message: 'Unsupported format',
            error: `Format ${publication.format} is not supported for Instagram`,
          };
      }
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

  private async publishFeed(
    publication: PublicationWithRelations,
  ): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media) {
      return {
        success: false,
        message: 'No media found',
        error: 'Feed post requires at least one image',
      };
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

    this.logger.log(`Media container created with ID: ${data.id}`);
    await this.delay(this.mediaProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      data.id,
      socialAccount.platformUserId!,
      socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: `https://www.instagram.com/p/${publishedMediaId}`,
      message: 'Feed post published successfully to Instagram',
    };
  }

  private async publishStory(
    publication: PublicationWithRelations,
  ): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media) {
      return {
        success: false,
        message: 'No media found',
        error: 'Story requires at least one image or video',
      };
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

    await this.delay(this.mediaProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      data.id,
      socialAccount.platformUserId!,
      socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: undefined,
      message: 'Story published successfully to Instagram',
    };
  }

  private async publishReel(
    publication: PublicationWithRelations,
  ): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media || media.type !== 'VIDEO') {
      return {
        success: false,
        message: 'Invalid media',
        error: 'Reel requires a video file',
      };
    }

    const caption =
      publication.customCaption || publication.content.caption || '';

    const params = new URLSearchParams({
      video_url: media.url,
      caption,
      media_type: 'REELS',
      access_token: socialAccount.accessToken!,
    });
    if (media.thumbnail) params.append('cover_url', media.thumbnail);

    const data = await this.callInstagramApi(
      `${this.apiUrl}/${socialAccount.platformUserId}/media`,
      params,
      'createReelContainer',
    );

    await this.delay(this.videoProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      data.id,
      socialAccount.platformUserId!,
      socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: `https://www.instagram.com/reel/${publishedMediaId}`,
      message: 'Reel published successfully to Instagram',
    };
  }

  private async publishCarousel(
    publication: PublicationWithRelations,
  ): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const mediaItems = publication.mediaUsage;

    if (!mediaItems || mediaItems.length < 2) {
      return {
        success: false,
        message: 'Invalid media count',
        error: 'Carousel requires at least 2 media items',
      };
    }

    const caption =
      publication.customCaption || publication.content.caption || '';

    const mediaIds = await Promise.all(
      mediaItems.map((item, index) => {
        const params = new URLSearchParams({
          is_carousel_item: 'true',
          access_token: socialAccount.accessToken!,
        });
        if (item.media.type === 'VIDEO') {
          params.append('video_url', item.media.url);
          params.append('media_type', 'VIDEO');
        } else {
          params.append('image_url', item.media.url);
          params.append('media_type', 'IMAGE');
        }

        return this.callInstagramApi(
          `${this.apiUrl}/${socialAccount.platformUserId}/media`,
          params,
          `createCarouselItem[${index}]`,
        ).then((data) => data.id as string);
      }),
    );

    await this.delay(this.mediaProcessingWaitTime);

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

    await this.delay(this.mediaProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      carouselData.id,
      socialAccount.platformUserId!,
      socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: `https://www.instagram.com/p/${publishedMediaId}`,
      message: 'Carousel published successfully to Instagram',
    };
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
  ): Promise<any> {
    try {
      const response = await axios.post(url, params, {
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
