import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { CreatePostDto, CreateMediaResponse, PublishMediaResponse, SchedulePostDto } from './instagram.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Publication } from '@prisma/client';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly instagramApiUrl = 'https://graph.instagram.com/v24.0';
  private readonly instagramAccountId = '25664926903117298';
  private readonly accessToken = 'IGAARSwE90qqdBZAFlxVjBUYnF6d1dwTnFPcEhxS3A0Y3JwRE94MWNnZA0dFcXRLUVZAtYWJBTVp5S3dKcFJDZAGVSSDdPc1ZAaaDl4MnR3ZA3g3ckhFYXN6ZAXZAQM054X000bzhJampxeUE0bF9LaGktai13RnlEUjc2UlJJSGhEUFV3ZAwZDZD';

  constructor(private readonly prisma: PrismaService) {}

  async publishPost(createPostDto: CreatePostDto): Promise<{ success: boolean; mediaId: string; message: string }> {
    try {
      // Step 1: Create media container
      this.logger.log('Creating media container...');
      const mediaId = await this.createMediaContainer(createPostDto);
      this.logger.log(`Media container created with ID: ${mediaId}`);

      // Wait for Instagram to process the media (typically takes a few seconds)
      this.logger.log('Waiting for Instagram to process the media...');
      await this.delay(1000); // Wait 5 seconds

      // Step 2: Publish the media
      this.logger.log('Publishing media...');
      const publishedMediaId = await this.publishMedia(mediaId);
      this.logger.log(`Media published successfully with ID: ${publishedMediaId}`);

      return {
        success: true,
        mediaId: publishedMediaId,
        message: 'Post published successfully on Instagram',
      };
    } catch (error) {
      this.logger.error('Error publishing post to Instagram', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new HttpException(
          {
            success: false,
            message: 'Failed to publish post to Instagram',
            error: axiosError.response?.data || axiosError.message,
          },
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: 'An unexpected error occurred',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createMediaContainer(createPostDto: CreatePostDto): Promise<string> {
    const url = `${this.instagramApiUrl}/${this.instagramAccountId}/media`;
    
    const params = new URLSearchParams();
    params.append('image_url', createPostDto.image_url);
    params.append('caption', createPostDto.caption);
    params.append('access_token', this.accessToken);

    try {
      const response = await axios.post<CreateMediaResponse>(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data.id;
    } catch (error) {
      this.logger.error('Error creating media container', error);
      throw error;
    }
  }

  private async publishMedia(creationId: string): Promise<string> {
    const url = `${this.instagramApiUrl}/${this.instagramAccountId}/media_publish`;
    
    const params = new URLSearchParams();
    params.append('creation_id', creationId);
    params.append('access_token', this.accessToken);

    try {
      const response = await axios.post<PublishMediaResponse>(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data.id;
    } catch (error) {
      this.logger.error('Error publishing media', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async schedulePost(schedulePostDto: SchedulePostDto, userId: string, socialAccountId: string): Promise<Publication> {
    try {
      this.logger.log('Creating scheduled post...');

      // Verificar que la cuenta social existe y pertenece al usuario
      const socialAccount = await this.prisma.socialAccount.findFirst({
        where: {
          id: socialAccountId,
          userId: userId,
          platform: 'INSTAGRAM',
          disconnectedAt: null,
        },
      });

      if (!socialAccount) {
        throw new HttpException(
          {
            success: false,
            message: 'Instagram social account not found or not active',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // DEPRECATED: This method should use the new Content + Media approach
      // For now, create a simple content with caption only
      // The frontend should use the new flow: upload to R2 -> create content -> create publication
      const content = await this.prisma.content.create({
        data: {
          caption: schedulePostDto.caption,
          userId: userId,
        },
      });

      // Note: This is a legacy approach - media should be uploaded first and linked
      // This will not work without proper media relations
      this.logger.warn('DEPRECATED: Use POST /content with media, then POST /publications');

      // Create publication (without media - will fail on publish)
      const publication = await this.prisma.publication.create({
        data: {
          contentId: content.id,
          socialAccountId: socialAccountId,
          platform: 'INSTAGRAM',
          format: 'FEED',
          publishAt: new Date(schedulePostDto.publishAt),
          status: 'SCHEDULED',
          customCaption: schedulePostDto.caption,
          // Note: mediaUrl is ignored - use new flow instead
        },
      });

      this.logger.log(`Scheduled publication created with ID: ${publication.id}`);
      return publication;
    } catch (error) {
      this.logger.error('Error creating scheduled post', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create scheduled post',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
