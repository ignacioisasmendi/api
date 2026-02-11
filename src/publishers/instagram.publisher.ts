import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { Publication, ContentFormat } from '@prisma/client';
import { IPlatformPublisher, ValidationResult, PublishResult } from './interfaces/platform-publisher.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InstagramPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(InstagramPublisher.name);
  private readonly apiUrl: string;
  private readonly mediaProcessingWaitTime: number;
  private readonly videoProcessingWaitTime: number;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    this.apiUrl = this.configService.get<string>('instagram.apiUrl')!;
    this.mediaProcessingWaitTime = this.configService.get<number>('instagram.mediaProcessingWaitTime')!;
    this.videoProcessingWaitTime = this.configService.get<number>('instagram.videoProcessingWaitTime')!;
  }

  async validatePayload(payload: any, format: string): Promise<ValidationResult> {
    // Validation is now done at the publication level, not payload level
    // We validate media files and format compatibility here
    return {
      isValid: true,
      errors: undefined,
    };
  }

  async publish(publication: any): Promise<PublishResult> {
    try {
      this.logger.log(`Publishing to Instagram: ${publication.id}`);

      // Get full publication with media
      const fullPublication = await this.prismaService.publication.findUnique({
        where: { id: publication.id },
        include: {
          content: true,
          socialAccount: true,
          mediaUsage: {
            include: { media: true },
            orderBy: { order: 'asc' },
          },
        },
      });
      
      if (!fullPublication || !fullPublication.mediaUsage.length) {
        return {
          success: false,
          message: 'No media found for publication',
          error: 'Publication must have at least one media file',
        };
      }

      switch (fullPublication.format) {
        case ContentFormat.FEED:
          return await this.publishFeed(fullPublication);
        case ContentFormat.STORY:
          return await this.publishStory(fullPublication);
        case ContentFormat.REEL:
          return await this.publishReel(fullPublication);
        case ContentFormat.CAROUSEL:
          return await this.publishCarousel(fullPublication);
        default:
          return {
            success: false,
            message: 'Unsupported format',
            error: `Format ${fullPublication.format} is not supported for Instagram`,
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

  private async publishFeed(publication: any): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media; // Get first media
    
    if (!media) {
      return {
        success: false,
        message: 'No media found',
        error: 'Feed post requires at least one image',
      };
    }

    // Get caption (use customCaption if provided, otherwise use content caption)
    const caption = publication.customCaption || publication.content.caption || '';

    // Step 1: Create media container
    const mediaId = await this.createMediaContainer(
      media.url,
      caption,
      socialAccount.platformUserId,
      socialAccount.accessToken,
    );
    
    this.logger.log(`Media container created with ID: ${mediaId}`);
    
    // Wait for Instagram to process
    await this.delay(this.mediaProcessingWaitTime);


    this.logger.log("publishing media to instagram");    // Step 2: Publish the media

    const publishedMediaId = await this.publishMedia(
          mediaId,
          socialAccount.platformUserId,
          socialAccount.accessToken,
        );

    // Generate Instagram post link
    const link = `https://www.instagram.com/p/${publishedMediaId}`;

    return {
      success: true,
      platformId: publishedMediaId,
      link: link,
      message: 'Feed post published successfully to Instagram',
    };
  }

  private async publishStory(publication: any): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;
    
    if (!media) {
      return {
        success: false,
        message: 'No media found',
        error: 'Story requires at least one image or video',
      };
    }

    // Instagram Stories API
    const link = publication.platformConfig?.link;
    const mediaId = await this.createStoryContainer(
      media.url,
      socialAccount.platformUserId,
      socialAccount.accessToken,
      link,
    );
    
    await this.delay(this.mediaProcessingWaitTime);
    
    const publishedMediaId = await this.publishMedia(
      mediaId,
      socialAccount.platformUserId,
      socialAccount.accessToken,
    );

    return {
      success: true,
      platformId: publishedMediaId,
      link: undefined, // Stories don't have permanent URLs
      message: 'Story published successfully to Instagram',
    };
  }

  private async publishReel(publication: any): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const media = publication.mediaUsage[0]?.media;
    
    if (!media || media.type !== 'VIDEO') {
      return {
        success: false,
        message: 'Invalid media',
        error: 'Reel requires a video file',
      };
    }

    const caption = publication.customCaption || publication.content.caption || '';
    const coverUrl = media.thumbnail;

    // Instagram Reels API
    const mediaId = await this.createReelContainer(
      media.url,
      caption,
      socialAccount.platformUserId,
      socialAccount.accessToken,
      coverUrl,
    );
    
    await this.delay(this.videoProcessingWaitTime); // Videos take longer
    
    const publishedMediaId = await this.publishMedia(
      mediaId,
      socialAccount.platformUserId,
      socialAccount.accessToken,
    );

    // Generate Instagram reel link
    const link = `https://www.instagram.com/reel/${publishedMediaId}`;

    return {
      success: true,
      platformId: publishedMediaId,
      link: link,
      message: 'Reel published successfully to Instagram',
    };
  }

  private async publishCarousel(publication: any): Promise<PublishResult> {
    const socialAccount = publication.socialAccount;
    const mediaItems = publication.mediaUsage;
    
    if (!mediaItems || mediaItems.length < 2) {
      return {
        success: false,
        message: 'Invalid media count',
        error: 'Carousel requires at least 2 media items',
      };
    }

    const caption = publication.customCaption || publication.content.caption || '';

    // Create media containers for each item
    const mediaIds = await Promise.all(
      mediaItems.map((item: any) =>
        this.createCarouselItemContainer(
          item.media.url,
          item.media.type === 'VIDEO',
          socialAccount.platformUserId,
          socialAccount.accessToken,
        ),
      ),
    );

    // Wait for processing
    await this.delay(this.mediaProcessingWaitTime);

    // Create carousel container
    const carouselId = await this.createCarouselContainer(
      mediaIds,
      caption,
      socialAccount.platformUserId,
      socialAccount.accessToken,
    );

    // Wait again
    await this.delay(this.mediaProcessingWaitTime);

    // Publish
    const publishedMediaId = await this.publishMedia(
      carouselId,
      socialAccount.platformUserId,
      socialAccount.accessToken,
    );

    const link = `https://www.instagram.com/p/${publishedMediaId}`;

    return {
      success: true,
      platformId: publishedMediaId,
      link: link,
      message: 'Carousel published successfully to Instagram',
    };
  }

  private async createMediaContainer(imageUrl: string, caption: string, platformUserId: string, accessToken: string): Promise<string> {
    
    this.logger.log("creating media container");

    //create tty and catch the error
    try {
      const url = `${this.apiUrl}/${platformUserId}/media`;
      const params = new URLSearchParams();
      params.append('image_url', imageUrl);
      params.append('caption', caption);
      params.append('access_token', accessToken || '');

      const response = await axios.post(url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          'Failed to create media container',
          {
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers,
          }
        );
      } else {
        this.logger.error(
          `Failed to create media container: ${error.message}`,
          error.stack
        );
      }
    
      throw error;
    }
  }

  private async createStoryContainer(imageUrl: string, platformUserId: string, accessToken: string, link?: string): Promise<string> {
    const url = `${this.apiUrl}/${platformUserId}/media`;
    
    const params = new URLSearchParams();
    params.append('image_url', imageUrl);
    params.append('media_type', 'STORIES');
    if (link) {
      params.append('link', link);
    }
    params.append('access_token', accessToken);

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.id;
  }

  private async createReelContainer(videoUrl: string, caption: string, platformUserId: string, accessToken: string, coverUrl?: string): Promise<string> {
    const url = `${this.apiUrl}/${platformUserId}/media`;
    
    const params = new URLSearchParams();
    params.append('video_url', videoUrl);
    params.append('caption', caption);
    params.append('media_type', 'REELS');
    if (coverUrl) {
      params.append('cover_url', coverUrl);
    }
    params.append('access_token', accessToken);

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.id;
  }

  private async createCarouselItemContainer(mediaUrl: string, isVideo: boolean, platformUserId: string, accessToken: string): Promise<string> {
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

  private async createCarouselContainer(mediaIds: string[], caption: string, platformUserId: string, accessToken: string): Promise<string> {
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

  private async publishMedia(creationId: string, platformUserId: string, accessToken: string): Promise<string> {
    const url = `${this.apiUrl}/${platformUserId}/media_publish`;
    
    this.logger.log(`Publishing media to Instagram: ${url}`);
    const params = new URLSearchParams();
    params.append('creation_id', creationId);
    params.append('access_token', accessToken || '');

    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.id;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
