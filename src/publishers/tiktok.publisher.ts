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
import { TiktokCreatorService } from '../tiktok/creator/tiktok-creator.service';
import { InitDirectPostDto } from '../tiktok/post/dto/init-direct-post.dto';
import {
  TikTokPrivacyLevel,
  TikTokSourceType,
} from '../tiktok/tiktok.constants';
import { isFileUploadInitData } from '../tiktok/tiktok.types';
import { EncryptionService } from '../shared/encryption/encryption.service';

const PRIVACY_LEVEL_PREFERENCE: TikTokPrivacyLevel[] = [
  TikTokPrivacyLevel.SELF_ONLY,
  TikTokPrivacyLevel.FOLLOWER_OF_CREATOR,
  TikTokPrivacyLevel.MUTUAL_FOLLOW_FRIENDS,
  TikTokPrivacyLevel.PUBLIC_TO_EVERYONE,
];

@Injectable()
export class TikTokPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(TikTokPublisher.name);

  constructor(
    private readonly tiktokPostService: TiktokPostService,
    private readonly tiktokCreatorService: TiktokCreatorService,
    private readonly encryptionService: EncryptionService,
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
    const accessToken = this.encryptionService.decrypt(
      socialAccount.accessToken,
    )!;
    const refreshToken = this.encryptionService.decrypt(
      socialAccount.refreshToken,
    )!;

    // Use auto-retry wrapper to handle token expiration
    return await this.tiktokPostService.executeWithTokenRefresh(
      socialAccount.id,
      refreshToken,
      accessToken,
      async (accessToken: string) => {
        return await this.publishWithToken(
          accessToken,
          caption,
          videoMedia,
          publication.platformConfig as Record<string, unknown> | null,
          publication.id,
          socialAccount.username ?? '',
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
    username: string,
  ): Promise<PublishResult> {
    const tempFilePath = path.join(
      os.tmpdir(),
      `tiktok_${publicationId}_${Date.now()}.mp4`,
    );

    try {
      // 1. Query creator info to validate supported privacy levels
      const requestedLevel =
        (platformConfig?.privacy_level as TikTokPrivacyLevel) ??
        TikTokPrivacyLevel.SELF_ONLY;

      const privacyLevel = await this.resolvePrivacyLevel(
        accessToken,
        requestedLevel,
      );

      // 2. Download video from R2 to a local temp file
      await this.downloadToTemp(videoMedia.url, tempFilePath);
      const fileSize = fs.statSync(tempFilePath).size;

      // 3. Build the DTO using stored platformConfig settings
      const dto = new InitDirectPostDto();
      dto.title = caption.substring(0, 150);
      dto.privacy_level = privacyLevel;
      dto.disable_comment =
        (platformConfig?.disable_comment as boolean) ?? false;
      dto.disable_duet = (platformConfig?.disable_duet as boolean) ?? false;
      dto.disable_stitch =
        (platformConfig?.disable_stitch as boolean) ?? false;
      dto.source_type = TikTokSourceType.FILE_UPLOAD;
      dto.video_size = fileSize;

      // 4. Initialize the direct post
      const initData = await this.tiktokPostService.initDirectPost(
        accessToken,
        dto,
      );

      // 5. Upload the video bytes to TikTok's upload URL
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

      const link = await this.waitForPublishComplete(
        accessToken,
        initData.publish_id,
        username,
      );

      return {
        success: true,
        platformId: initData.publish_id,
        link,
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
   * Query the creator's supported privacy levels and return a valid one.
   * Falls back through PRIVACY_LEVEL_PREFERENCE if the requested level
   * is not supported, ultimately defaulting to SELF_ONLY.
   */
  private async resolvePrivacyLevel(
    accessToken: string,
    requested: TikTokPrivacyLevel,
  ): Promise<TikTokPrivacyLevel> {
    try {
      const creatorInfo =
        await this.tiktokCreatorService.queryCreatorInfo(accessToken);

      const supported = creatorInfo.privacy_level_options;

      if (supported.includes(requested)) {
        return requested;
      }

      this.logger.warn(
        `Requested privacy level "${requested}" not supported by this account (supported: ${supported.join(', ')}). Falling back.`,
      );

      const fallback =
        PRIVACY_LEVEL_PREFERENCE.find((level) => supported.includes(level)) ??
        TikTokPrivacyLevel.SELF_ONLY;

      this.logger.log(`Using fallback privacy level: "${fallback}"`);
      return fallback;
    } catch (err) {
      this.logger.warn(
        `Failed to query creator info, defaulting to SELF_ONLY: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      return TikTokPrivacyLevel.SELF_ONLY;
    }
  }

  /**
   * Poll TikTok's publish status endpoint until the video is live,
   * then return its permalink. Returns undefined on timeout or failure.
   */
  private async waitForPublishComplete(
    accessToken: string,
    publishId: string,
    username: string,
  ): Promise<string | undefined> {
    const maxWaitMs = 3 * 60 * 1000; // 3 minutes
    const pollIntervalMs = 5_000;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      await this.delay(pollIntervalMs);

      try {
        const statusData = await this.tiktokPostService.queryPublishStatus(
          accessToken,
          publishId,
        );

        if (
          statusData.status === 'PUBLISH_COMPLETE' &&
          statusData.publicaly_available_post_id?.length
        ) {
          const videoId = statusData.publicaly_available_post_id[0];
          return `https://www.tiktok.com/@${username}/video/${videoId}`;
        }

        if (statusData.status === 'FAILED') {
          this.logger.warn(
            `TikTok publish failed for publish_id ${publishId}: ${statusData.fail_reason ?? 'unknown reason'}`,
          );
          return undefined;
        }

        this.logger.debug(
          `TikTok publish status for ${publishId}: ${statusData.status}`,
        );
      } catch (err) {
        this.logger.warn(
          `Error polling TikTok publish status for ${publishId}: ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    }

    this.logger.warn(
      `Timeout waiting for TikTok publish_id ${publishId} to complete`,
    );
    return undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
