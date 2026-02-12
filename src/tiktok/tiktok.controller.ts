import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetClientId } from '../decorators/get-client-id.decorator';
import { TiktokCreatorService } from './creator/tiktok-creator.service';
import { TiktokPostService } from './post/tiktok-post.service';
import { InitDirectPostDto } from './post/dto/init-direct-post.dto';
import { InitDirectPostWithAccountDto } from './dto/init-direct-post-with-account.dto';
import { UploadPublishBodyDto } from './dto/upload-publish-body.dto';
import { TikTokSourceType } from './tiktok.constants';
import { isFileUploadInitData } from './tiktok.types';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as os from 'os';

/**
 * TikTok Content Posting API controller.
 *
 * All endpoints are protected by the global Auth0Guard.
 * The authenticated user is resolved via the @GetUser() decorator (CLS-based).
 *
 * Endpoints:
 *   GET  /tiktok/creator-info/:socialAccountId  — Query creator capabilities
 *   POST /tiktok/publish/init                    — Initialize a direct post (PULL_FROM_URL)
 *   POST /tiktok/publish/upload/:socialAccountId — Upload + publish video (FILE_UPLOAD)
 */
@Controller('tiktok')
export class TiktokController {
  private readonly logger = new Logger(TiktokController.name);

  constructor(
    private readonly tiktokCreatorService: TiktokCreatorService,
    private readonly tiktokPostService: TiktokPostService,
    private readonly prismaService: PrismaService,
  ) {}

  // ────────────────────────────────────────────────────────────────
  // 1. Creator Info
  // ────────────────────────────────────────────────────────────────

  /**
   * GET /tiktok/creator-info/:socialAccountId
   *
   * Returns the TikTok creator's posting capabilities:
   * - supported privacy levels
   * - comment / duet / stitch availability
   * - max video duration
   *
   * Uses token-refresh wrapper so expired tokens are handled transparently.
   */
  @Get('creator-info/:socialAccountId')
  async getCreatorInfo(
    @GetClientId() clientId: string,
    @Param('socialAccountId') socialAccountId: string,
  ) {
    const socialAccount = await this.findAndValidateSocialAccount(
      socialAccountId,
      clientId,
    );

    const creatorInfo = await this.tiktokPostService.executeWithTokenRefresh(
      socialAccount.id,
      socialAccount.refreshToken!,
      socialAccount.accessToken!,
      (token) => this.tiktokCreatorService.queryCreatorInfo(token),
    );

    return {
      success: true,
      data: creatorInfo,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Direct Post Init (PULL_FROM_URL)
  // ────────────────────────────────────────────────────────────────

  /**
   * POST /tiktok/publish/init
   *
   * Initialize a TikTok direct post. Supports both PULL_FROM_URL
   * and FILE_UPLOAD source types.
   *
   * For PULL_FROM_URL: TikTok pulls the video from the provided URL.
   * No further action is needed — the post is submitted.
   *
   * For FILE_UPLOAD: returns an `upload_url`. The caller must then
   * upload the video to that URL (or use the /publish/upload endpoint).
   *
   * Body: InitDirectPostDto + `socialAccountId`
   */
  @Post('publish/init')
  @HttpCode(HttpStatus.OK)
  async initDirectPost(
    @GetClientId() clientId: string,
    @Body() body: InitDirectPostWithAccountDto,
  ) {
    const socialAccount = await this.findAndValidateSocialAccount(
      body.socialAccountId,
      clientId,
    );

    const initData = await this.tiktokPostService.executeWithTokenRefresh(
      socialAccount.id,
      socialAccount.refreshToken!,
      socialAccount.accessToken!,
      (token) => this.tiktokPostService.initDirectPost(token, body),
    );

    return {
      success: true,
      data: initData,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 3. Video Upload (FILE_UPLOAD flow — complete in one request)
  // ────────────────────────────────────────────────────────────────

  /**
   * POST /tiktok/publish/upload/:socialAccountId
   *
   * Full FILE_UPLOAD flow in a single request:
   * 1. Accepts a multipart video file upload
   * 2. Queries creator info to validate capabilities
   * 3. Initializes the direct post with FILE_UPLOAD source
   * 4. Streams the uploaded file to TikTok's upload URL
   * 5. Cleans up the temp file
   *
   * Form fields (multipart/form-data):
   *   - file: video file
   *   - title: video caption (max 150 chars)
   *   - privacy_level: one of PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, etc.
   *   - disable_comment: "true" | "false"
   *   - disable_duet: "true" | "false"
   *   - disable_stitch: "true" | "false"
   */
  @Post('publish/upload/:socialAccountId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      // Store uploaded file to disk (temp dir) — avoids buffering in memory
      dest: os.tmpdir(),
      limits: {
        fileSize: 4 * 1024 * 1024 * 1024, // 4 GB max per TikTok spec
      },
      fileFilter: (_req, file, callback) => {
        // Only accept video MIME types
        if (!file.mimetype.startsWith('video/')) {
          return callback(
            new BadRequestException('Only video files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAndPublish(
    @GetClientId() clientId: string,
    @Param('socialAccountId') socialAccountId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadPublishBodyDto,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    const socialAccount = await this.findAndValidateSocialAccount(
      socialAccountId,
      clientId,
    );

    // Temp file path written by Multer
    const tempFilePath = file.path;

    try {
      // Build the init DTO from the multipart body
      const dto = new InitDirectPostDto();
      dto.title = body.title;
      dto.privacy_level = body.privacy_level;
      dto.disable_comment = body.disable_comment;
      dto.disable_duet = body.disable_duet;
      dto.disable_stitch = body.disable_stitch;
      dto.source_type = TikTokSourceType.FILE_UPLOAD;
      dto.video_size = file.size;

      // Execute with automatic token refresh
      const result = await this.tiktokPostService.executeWithTokenRefresh(
        socialAccount.id,
        socialAccount.refreshToken!,
        socialAccount.accessToken!,
        async (token) => {
          // 1. Init the direct post
          const initData = await this.tiktokPostService.initDirectPost(
            token,
            dto,
          );

          // 2. Upload the video to TikTok's upload URL
          if (!isFileUploadInitData(initData)) {
            throw new HttpException(
              'Expected upload_url in FILE_UPLOAD response',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          await this.tiktokPostService.uploadVideo(
            initData.upload_url,
            tempFilePath,
            file.size,
          );

          return initData;
        },
      );

      return {
        success: true,
        data: {
          publish_id: result.publish_id,
          message: 'Video uploaded and post submitted to TikTok',
        },
      };
    } finally {
      // Always clean up the temp file
      this.cleanupTempFile(tempFilePath);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────

  /**
   * Load a SocialAccount from the DB and verify it belongs to the
   * authenticated client, is active, and is a TikTok account.
   */
  private async findAndValidateSocialAccount(
    socialAccountId: string,
    clientId: string,
  ) {
    const socialAccount = await this.prismaService.socialAccount.findFirst({
      where: {
        id: socialAccountId,
        clientId,
        platform: 'TIKTOK',
        isActive: true,
        disconnectedAt: null,
      },
    });

    if (!socialAccount) {
      throw new HttpException(
        'TikTok social account not found or not active',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!socialAccount.accessToken || !socialAccount.refreshToken) {
      throw new HttpException(
        'TikTok account is missing authentication tokens',
        HttpStatus.BAD_REQUEST,
      );
    }

    return socialAccount;
  }

  /**
   * Remove a temporary file from disk (best-effort, non-throwing).
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Cleaned up temp file: ${filePath}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to clean up temp file: ${filePath}`, err);
    }
  }
}
