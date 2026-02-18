import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ContentFormat } from '@prisma/client';
import { IPlatformPublisher, PublicationWithRelations, ValidationResult, PublishResult } from './interfaces/platform-publisher.interface';

@Injectable()
export class InstagramPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(InstagramPublisher.name);
  private readonly apiUrl: string;
  private readonly mediaProcessingWaitTime: number;
  private readonly videoProcessingWaitTime: number;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('instagram.apiUrl')!;
    this.mediaProcessingWaitTime = this.configService.get<number>('instagram.mediaProcessingWaitTime')!;
    this.videoProcessingWaitTime = this.configService.get<number>('instagram.videoProcessingWaitTime')!;
  }

  async validatePayload(_payload: Record<string, unknown>, _format: string): Promise<ValidationResult> {
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
      this.logger.error(`Failed to publish to Instagram: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to publish to Instagram',
        error: error.message,
      };
    }
  }

  private async publishFeed(publication: PublicationWithRelations): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media) {
      return { success: false, message: 'No media found', error: 'Feed post requires at least one image' };
    }

    const caption = publication.customCaption || publication.content.caption || '';

    const mediaId = await this.createMediaContainer(
      media.url, caption, socialAccount.platformUserId!, socialAccount.accessToken!,
    );

    this.logger.log(`Media container created with ID: ${mediaId}`);
    await this.delay(this.mediaProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      mediaId, socialAccount.platformUserId!, socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: `https://www.instagram.com/p/${publishedMediaId}`,
      message: 'Feed post published successfully to Instagram',
    };
  }

  private async publishStory(publication: PublicationWithRelations): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media) {
      return { success: false, message: 'No media found', error: 'Story requires at least one image or video' };
    }

    const link = (publication.platformConfig as Record<string, unknown> | null)?.link as string | undefined;

    const mediaId = await this.createStoryContainer(
      media.url, socialAccount.platformUserId!, socialAccount.accessToken!, link,
    );

    await this.delay(this.mediaProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      mediaId, socialAccount.platformUserId!, socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: undefined, // Stories don't have permanent URLs
      message: 'Story published successfully to Instagram',
    };
  }

  private async publishReel(publication: PublicationWithRelations): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;

    if (!media || media.type !== 'VIDEO') {
      return { success: false, message: 'Invalid media', error: 'Reel requires a video file' };
    }

    const caption = publication.customCaption || publication.content.caption || '';

    const mediaId = await this.createReelContainer(
      media.url, caption, socialAccount.platformUserId!, socialAccount.accessToken!, media.thumbnail ?? undefined,
    );

    await this.delay(this.videoProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      mediaId, socialAccount.platformUserId!, socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: `https://www.instagram.com/reel/${publishedMediaId}`,
      message: 'Reel published successfully to Instagram',
    };
  }

  private async publishCarousel(publication: PublicationWithRelations): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const mediaItems = publication.mediaUsage;

    if (!mediaItems || mediaItems.length < 2) {
      return { success: false, message: 'Invalid media count', error: 'Carousel requires at least 2 media items' };
    }

    const caption = publication.customCaption || publication.content.caption || '';

    const mediaIds = await Promise.all(
      mediaItems.map(item =>
        this.createCarouselItemContainer(
          item.media.url,
          item.media.type === 'VIDEO',
          socialAccount.platformUserId!,
          socialAccount.accessToken!,
        ),
      ),
    );

    await this.delay(this.mediaProcessingWaitTime);

    const carouselId = await this.createCarouselContainer(
      mediaIds, caption, socialAccount.platformUserId!, socialAccount.accessToken!,
    );

    await this.delay(this.mediaProcessingWaitTime);

    const publishedMediaId = await this.publishMedia(
      carouselId, socialAccount.platformUserId!, socialAccount.accessToken!,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: `https://www.instagram.com/p/${publishedMediaId}`,
      message: 'Carousel published successfully to Instagram',
    };
  }

  private async createMediaContainer(
    imageUrl: string, caption: string, platformUserId: string, accessToken: string,
  ): Promise<string> {
    this.logger.log('creating media container');
    try {
      const url = `${this.apiUrl}/${platformUserId}/media`;
      const params = new URLSearchParams();
      params.append('image_url', imageUrl);
      params.append('caption', caption);
      params.append('access_token', accessToken);

      const response = await axios.post(url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error('Failed to create media container', {
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        this.logger.error(`Failed to create media container: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  private async createStoryContainer(
    imageUrl: string, platformUserId: string, accessToken: string, link?: string,
  ): Promise<string> {
    const url = `${this.apiUrl}/${platformUserId}/media`;
    const params = new URLSearchParams();
    params.append('image_url', imageUrl);
    params.append('media_type', 'STORIES');
    if (link) params.append('link', link);
    params.append('access_token', accessToken);

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.id;
  }

  private async createReelContainer(
    videoUrl: string, caption: string, platformUserId: string, accessToken: string, coverUrl?: string,
  ): Promise<string> {
    const url = `${this.apiUrl}/${platformUserId}/media`;
    const params = new URLSearchParams();
    params.append('video_url', videoUrl);
    params.append('caption', caption);
    params.append('media_type', 'REELS');
    if (coverUrl) params.append('cover_url', coverUrl);
    params.append('access_token', accessToken);

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.id;
  }

  private async createCarouselItemContainer(
    mediaUrl: string, isVideo: boolean, platformUserId: string, accessToken: string,
  ): Promise<string> {
    const url = `${this.apiUrl}/${platformUserId}/media`;
    const params = new URLSearchParams();
    if (isVideo) {
      params.append('video_url', mediaUrl);
      params.append('media_type', 'VIDEO');
    } else {
      params.append('image_url', mediaUrl);
      params.append('media_type', 'IMAGE');
    }
    params.append('is_carousel_item', 'true');
    params.append('access_token', accessToken);

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.id;
  }

  private async createCarouselContainer(
    mediaIds: string[], caption: string, platformUserId: string, accessToken: string,
  ): Promise<string> {
    const url = `${this.apiUrl}/${platformUserId}/media`;
    const params = new URLSearchParams();
    params.append('media_type', 'CAROUSEL');
    params.append('caption', caption);
    params.append('children', mediaIds.join(','));
    params.append('access_token', accessToken);

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.id;
  }

  private async publishMedia(
    creationId: string, platformUserId: string, accessToken: string,
  ): Promise<string> {
    this.logger.log(`Publishing media to Instagram`);
    try {
      const url = `${this.apiUrl}/${platformUserId}/media_publish`;
      const params = new URLSearchParams();
      params.append('creation_id', creationId);
      params.append('access_token', accessToken);

      const response = await axios.post(url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error('Failed to publish media to Instagram', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      this.logger.error(`Failed to publish media to Instagram: ${error.message}`, error.stack);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
