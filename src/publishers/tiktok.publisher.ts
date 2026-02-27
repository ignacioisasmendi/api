import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import {
  IPlatformPublisher,
  PublicationWithRelations,
  ValidationResult,
  PublishResult,
} from './interfaces/platform-publisher.interface';
import { TiktokPostService } from '../tiktok/post/tiktok-post.service';
import { InitDirectPostDto } from '../tiktok/post/dto/init-direct-post.dto';
import {
  TikTokPrivacyLevel,
  TikTokSourceType,
} from '../tiktok/tiktok.constants';
import { isFileUploadInitData } from '../tiktok/tiktok.types';

@Injectable()
export class TikTokPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(TikTokPublisher.name);

  constructor(
    private readonly tiktokPostService: TiktokPostService,
  ) {}

  async validatePayload(
    payload: Record<string, unknown>,
    _format: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!payload.video_url && !payload.file_path) {
      errors.push('Either video_url or file_path is required for TikTok');
    }

    if (!payload.description && !payload.title) {
      errors.push('description or title is required for TikTok');
    }

    if (
      typeof payload.description === 'string' &&
      payload.description.length > 150
    ) {
      errors.push('TikTok video description must be 150 characters or fewer');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async publish(publication: PublicationWithRelations): Promise<PublishResult> {
    this.logger.log(`Publishing to TikTok: ${publication.id}`);

    const { socialAccount, content, mediaUsage } = publication;

    if (!socialAccount.accessToken || !socialAccount.refreshToken) {
      return {
        success: false,
        message: 'Missing TikTok tokens',
        error: 'Social account is missing access_token or refresh_token',
      };
    }

    if (!mediaUsage.length || mediaUsage[0].media.type !== 'VIDEO') {
      return {
        success: false,
        message: 'No video media found',
        error: 'TikTok publishing requires a video file',
      };
    }

    const videoMedia = mediaUsage[0].media;
    const caption = publication.customCaption || content.caption || '';

    // Use auto-retry wrapper to handle token expiration
    return await this.tiktokPostService.executeWithTokenRefresh(
      socialAccount.id,
      socialAccount.refreshToken,
      socialAccount.accessToken,
      async (accessToken: string) => {
        return await this.publishWithToken(
          accessToken,
          caption,
          videoMedia,
          publication.platformConfig as Record<string, unknown> | null,
          publication.id,
        );
      },
    );
  }

  /**
   * Core publishing logic, called with a valid (possibly refreshed) access_token.
   *
   * Always uses FILE_UPLOAD: downloads the video from R2 to a temp file and
   * streams it to TikTok's upload URL. PULL_FROM_URL requires extra app-level
   * permissions in the TikTok developer portal that FILE_UPLOAD does not need.
   */
  private async publishWithToken(
    accessToken: string,
    caption: string,
    videoMedia: { url: string; size: number; type: string },
    platformConfig: Record<string, unknown> | null,
    publicationId: string,
  ): Promise<PublishResult> {
    const tempFilePath = path.join(
      os.tmpdir(),
      `tiktok_${publicationId}_${Date.now()}.mp4`,
    );

    try {
      // 1. Download video from R2 to a local temp file
      await this.downloadToTemp(videoMedia.url, tempFilePath);
      const fileSize = fs.statSync(tempFilePath).size;

      // 2. Build the DTO using stored platformConfig settings
      const dto = new InitDirectPostDto();
      dto.title = caption.substring(0, 150);
      dto.privacy_level =
        (platformConfig?.privacy_level as TikTokPrivacyLevel) ??
        TikTokPrivacyLevel.SELF_ONLY;
      dto.disable_comment =
        (platformConfig?.disable_comment as boolean) ?? false;
      dto.disable_duet = (platformConfig?.disable_duet as boolean) ?? false;
      dto.disable_stitch =
        (platformConfig?.disable_stitch as boolean) ?? false;
      dto.source_type = TikTokSourceType.FILE_UPLOAD;
      dto.video_size = fileSize;

      // 3. Initialize the direct post
      const initData = await this.tiktokPostService.initDirectPost(
        accessToken,
        dto,
      );

      // 4. Upload the video bytes to TikTok's upload URL
      if (!isFileUploadInitData(initData)) {
        throw new Error('Expected upload_url in FILE_UPLOAD response');
      }

      await this.tiktokPostService.uploadVideo(
        initData.upload_url,
        tempFilePath,
        fileSize,
      );

      this.logger.log(
        `TikTok post initiated successfully — publish_id: ${initData.publish_id}`,
      );

      return {
        success: true,
        platformId: initData.publish_id,
        message: 'TikTok video published successfully (FILE_UPLOAD)',
      };
    } finally {
      // Always clean up the temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          this.logger.log(`Cleaned up temp file: ${tempFilePath}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to clean up temp file: ${tempFilePath}`, err);
      }
    }
  }

  /**
   * Stream-download a remote video URL to a local file path.
   * Uses streaming so the file is never fully buffered in memory.
   */
  private async downloadToTemp(url: string, destPath: string): Promise<void> {
    this.logger.log(`Downloading video to temp file: ${url}`);

    const response = await axios.get<NodeJS.ReadableStream>(url, {
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(destPath);
    await pipeline(response.data, writer);

    this.logger.log(`Download complete: ${destPath}`);
  }
}
