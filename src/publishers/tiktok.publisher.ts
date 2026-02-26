import { Injectable, Logger } from '@nestjs/common';
import {
  IPlatformPublisher,
  PublicationWithRelations,
  ValidationResult,
  PublishResult,
} from './interfaces/platform-publisher.interface';
import { TiktokCreatorService } from '../tiktok/creator/tiktok-creator.service';
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
    private readonly tiktokCreatorService: TiktokCreatorService,
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
    try {
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
    } catch (error) {
      this.logger.error(
        `Failed to publish to TikTok: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: 'Failed to publish to TikTok',
        error: error.message,
      };
    }
  }

  /**
   * Core publishing logic, called with a valid (possibly refreshed) access_token.
   */
  private async publishWithToken(
    accessToken: string,
    caption: string,
    videoMedia: { url: string; size: number; type: string },
    platformConfig: Record<string, unknown> | null,
    publicationId: string,
  ): Promise<PublishResult> {
    // 1. Query creator info to validate privacy level support
    const creatorInfo =
      await this.tiktokCreatorService.queryCreatorInfo(accessToken);

    // Determine privacy level — use platformConfig override or default to SELF_ONLY
    const requestedPrivacy =
      (platformConfig?.privacy_level as TikTokPrivacyLevel) ??
      TikTokPrivacyLevel.SELF_ONLY;

    if (!creatorInfo.privacy_level_options.includes(requestedPrivacy)) {
      this.logger.warn(
        `Requested privacy "${requestedPrivacy}" not available. Falling back to SELF_ONLY.`,
      );
    }

    const effectivePrivacy = creatorInfo.privacy_level_options.includes(
      requestedPrivacy,
    )
      ? requestedPrivacy
      : (creatorInfo.privacy_level_options[0] as TikTokPrivacyLevel);

    // 2. Determine source type
    const isPublicUrl =
      videoMedia.url.startsWith('http://') ||
      videoMedia.url.startsWith('https://');
    const sourceType = isPublicUrl
      ? TikTokSourceType.PULL_FROM_URL
      : TikTokSourceType.FILE_UPLOAD;

    // 3. Build the DTO
    const dto = new InitDirectPostDto();
    dto.title = caption.substring(0, 150); // TikTok title max 150 chars
    dto.privacy_level = effectivePrivacy;
    dto.disable_comment =
      (platformConfig?.disable_comment as boolean) ??
      creatorInfo.comment_disabled;
    dto.disable_duet =
      (platformConfig?.disable_duet as boolean) ?? creatorInfo.duet_disabled;
    dto.disable_stitch =
      (platformConfig?.disable_stitch as boolean) ??
      creatorInfo.stitch_disabled;
    dto.source_type = sourceType;

    if (sourceType === TikTokSourceType.PULL_FROM_URL) {
      dto.video_url = videoMedia.url;
    } else {
      dto.video_size = videoMedia.size;
      dto.file_path = videoMedia.url; // Local path for FILE_UPLOAD
    }

    // 4. Initialize the direct post
    const initData = await this.tiktokPostService.initDirectPost(
      accessToken,
      dto,
    );

    // 5. Upload the video if FILE_UPLOAD
    if (
      sourceType === TikTokSourceType.FILE_UPLOAD &&
      isFileUploadInitData(initData)
    ) {
      await this.tiktokPostService.uploadVideo(
        initData.upload_url,
        dto.file_path!,
        dto.video_size!,
      );
    }

    this.logger.log(
      `TikTok post initiated successfully — publish_id: ${initData.publish_id}`,
    );

    return {
      success: true,
      platformId: initData.publish_id,
      message: `TikTok video published successfully (${sourceType})`,
    };
  }
}
