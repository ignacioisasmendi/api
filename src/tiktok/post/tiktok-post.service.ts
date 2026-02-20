import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';

import {
  TIKTOK_ENDPOINTS,
  TIKTOK_ERROR_CODES,
  TIKTOK_UPLOAD_CHUNK_SIZE,
  TIKTOK_SINGLE_UPLOAD_MAX_SIZE,
  TikTokSourceType,
} from '../tiktok.constants';
import {
  DirectPostInitResponse,
  DirectPostInitData,
  DirectPostInitRequestBody,
  TokenRefreshResponse,
  TikTokApiResponse,
  isFileUploadInitData,
} from '../tiktok.types';
import { InitDirectPostDto } from './dto/init-direct-post.dto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Service responsible for:
 * 1. Initializing a TikTok direct post (FILE_UPLOAD / PULL_FROM_URL).
 * 2. Uploading video bytes to TikTok's upload URL (streaming + chunked).
 * 3. Refreshing expired access tokens.
 * 4. Wrapping API calls with automatic token-refresh retry.
 *
 * Endpoints:
 * - POST /v2/post/publish/video/init/
 * - PUT  <upload_url>  (returned by init for FILE_UPLOAD)
 * - POST /v2/oauth/token/  (refresh grant)
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 */
@Injectable()
export class TiktokPostService {
  private readonly logger = new Logger(TiktokPostService.name);
  private readonly apiUrl: string;
  private readonly clientKey: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.apiUrl = this.configService.get<string>('tiktok.apiUrl')!;
    this.clientKey = this.configService.get<string>('tiktok.clientKey')!;
    this.clientSecret = this.configService.get<string>('tiktok.clientSecret')!;
  }

  // ────────────────────────────────────────────────────────────────
  // 1. Initialize Direct Post
  // ────────────────────────────────────────────────────────────────

  /**
   * Initialize a TikTok direct post.
   *
   * For FILE_UPLOAD, the response includes an `upload_url` where the
   * video bytes must be PUT-uploaded before the post is finalized.
   *
   * For PULL_FROM_URL, TikTok fetches the video from the provided URL;
   * no further upload step is needed.
   *
   * @param accessToken - Valid OAuth access_token.
   * @param dto         - Validated post initialization parameters.
   * @returns           - publish_id (always) + upload_url (FILE_UPLOAD only).
   */
  async initDirectPost(
    accessToken: string,
    dto: InitDirectPostDto,
  ): Promise<DirectPostInitData> {
    const url = `${this.apiUrl}${TIKTOK_ENDPOINTS.DIRECT_POST_INIT}`;

    // Build the request body per TikTok's spec
    const body: DirectPostInitRequestBody = {
      post_info: {
        title: dto.title,
        privacy_level: "SELF_ONLY",
        disable_comment: dto.disable_comment,
        disable_duet: dto.disable_duet,
        disable_stitch: dto.disable_stitch,
      },
      source_info: {
        source: dto.source_type,
      },
    };

    // Source-specific fields
    if (dto.source_type === TikTokSourceType.FILE_UPLOAD) {
      const videoSize = dto.video_size!;
      const chunkSize =
        videoSize <= TIKTOK_SINGLE_UPLOAD_MAX_SIZE
          ? videoSize
          : TIKTOK_UPLOAD_CHUNK_SIZE;
      const totalChunks = Math.ceil(videoSize / chunkSize);

      body.source_info.video_size = videoSize;
      body.source_info.chunk_size = chunkSize;
      body.source_info.total_chunk_count = totalChunks;
    } else {
      // PULL_FROM_URL
      body.source_info.video_url = dto.video_url;
    }

    this.logger.log(
      `Initializing TikTok direct post (${dto.source_type}) — title: "${dto.title}"`,
    );

    const { data: response } = await firstValueFrom(
      this.httpService.post<DirectPostInitResponse>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }),
    );

    if (response.error.code !== TIKTOK_ERROR_CODES.OK) {
      this.logger.error(
        `TikTok direct post init failed: ${response.error.code} – ${response.error.message}`,
      );
      throw new Error(
        `TikTok API error: ${response.error.code} – ${response.error.message}`,
      );
    }

    this.logger.log(`Direct post initialized — publish_id: ${response.data.publish_id}`);
    return response.data;
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Upload Video (FILE_UPLOAD only)
  // ────────────────────────────────────────────────────────────────

  /**
   * Upload a video file to TikTok's upload URL.
   *
   * - For files <= 64 MB: single PUT request with the full file streamed.
   * - For files > 64 MB: chunked upload — multiple PUT requests, each
   *   carrying a slice of the file with the appropriate Content-Range header.
   *
   * The file is **never** buffered entirely into memory; we use
   * `fs.createReadStream` with `start` / `end` options to stream
   * each chunk independently.
   *
   * @param uploadUrl - The upload URL returned from initDirectPost.
   * @param filePath  - Absolute path to the video file on disk.
   * @param fileSize  - Total file size in bytes.
   */
  async uploadVideo(
    uploadUrl: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    if (fileSize <= TIKTOK_SINGLE_UPLOAD_MAX_SIZE) {
      // ── Single-request upload ──────────────────────────────────
      await this.uploadSingleChunk(uploadUrl, filePath, fileSize);
    } else {
      // ── Chunked upload ─────────────────────────────────────────
      await this.uploadChunked(uploadUrl, filePath, fileSize);
    }

    this.logger.log('Video upload to TikTok complete');
  }

  /**
   * Upload the entire file in one PUT request (files <= 64 MB).
   */
  private async uploadSingleChunk(
    uploadUrl: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    this.logger.log(`Uploading video in a single request (${fileSize} bytes)`);

    try {
      const stream = fs.createReadStream(filePath);

      await firstValueFrom(
        this.httpService.put(uploadUrl, stream, {
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': fileSize.toString(),
            'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
      );
    } catch (error) {
      this.logger.error(
        { err: error, fileSize },
        `TikTok single-chunk upload failed`,
      );
      throw new Error(`TikTok video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload the file in multiple chunks (files > 64 MB).
   *
   * Each chunk is streamed from disk using `fs.createReadStream` with
   * `start` and `end` byte offsets — the full file is never loaded.
   */
  private async uploadChunked(
    uploadUrl: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    const chunkSize = TIKTOK_UPLOAD_CHUNK_SIZE;
    const totalChunks = Math.ceil(fileSize / chunkSize);

    this.logger.log(
      `Uploading video in ${totalChunks} chunks of ${chunkSize} bytes`,
    );

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, fileSize) - 1;
      const currentChunkSize = end - start + 1;

      this.logger.log(
        `Uploading chunk ${chunkIndex + 1}/${totalChunks} — bytes ${start}-${end}/${fileSize}`,
      );

      try {
        const stream = fs.createReadStream(filePath, { start, end });

        await firstValueFrom(
          this.httpService.put(uploadUrl, stream, {
            headers: {
              'Content-Type': 'video/mp4',
              'Content-Length': currentChunkSize.toString(),
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }),
        );
      } catch (error) {
        this.logger.error(
          { err: error, chunkIndex: chunkIndex + 1, totalChunks, start, end, fileSize },
          `TikTok chunk upload failed at chunk ${chunkIndex + 1}/${totalChunks}`,
        );
        throw new Error(
          `TikTok video upload failed at chunk ${chunkIndex + 1}/${totalChunks}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 3. Token Refresh
  // ────────────────────────────────────────────────────────────────

  /**
   * Refresh an expired TikTok access token.
   *
   * Uses the OAuth token endpoint with `grant_type=refresh_token`.
   * On success, persists the new tokens to the `SocialAccount` record
   * in the database.
   *
   * @param socialAccountId - DB id of the SocialAccount to update.
   * @param refreshToken    - The current refresh_token.
   * @returns New access_token string.
   */
  async refreshAccessToken(
    socialAccountId: string,
    refreshToken: string,
  ): Promise<string> {
    this.logger.warn(`Refreshing TikTok access token for account ${socialAccountId}`);

    const form = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const { data } = await firstValueFrom(
      this.httpService.post<TokenRefreshResponse>(
        `${this.apiUrl}${TIKTOK_ENDPOINTS.OAUTH_TOKEN}`,
        form.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      ),
    );

    // Persist the new tokens to the database
    await this.prismaService.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    this.logger.log('TikTok access token refreshed and persisted');
    return data.access_token;
  }

  // ────────────────────────────────────────────────────────────────
  // 4. Auto-retry Wrapper with Token Refresh
  // ────────────────────────────────────────────────────────────────

  /**
   * Execute an async operation that calls TikTok's API.
   * If the operation fails due to an expired / invalid access token,
   * refresh the token and retry **once**.
   *
   * @param socialAccountId - DB id used to look up & update tokens.
   * @param refreshToken    - Current refresh_token.
   * @param accessToken     - Current access_token (may be expired).
   * @param operation       - Async fn receiving a (possibly refreshed) access_token.
   * @returns The result of `operation`.
   */
  async executeWithTokenRefresh<T>(
    socialAccountId: string,
    refreshToken: string,
    accessToken: string,
    operation: (token: string) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(accessToken);
    } catch (error: any) {
      // Detect expired-token errors from TikTok
      const isTokenError = this.isTokenExpiredError(error);

      if (!isTokenError) {
        throw error; // Not a token issue — propagate immediately
      }

      this.logger.warn(
        'TikTok access token invalid/expired — attempting refresh…',
      );

      // Refresh the token and retry the operation once
      const newToken = await this.refreshAccessToken(
        socialAccountId,
        refreshToken,
      );

      return await operation(newToken);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────

  /**
   * Check whether an error from TikTok indicates an expired / invalid
   * access token.
   *
   * TikTok can signal this via:
   * - HTTP 401 status code
   * - `error.code === 'access_token_invalid'` in the response body
   */
  private isTokenExpiredError(error: any): boolean {
    // Axios error with HTTP 401
    if (error?.response?.status === 401) {
      return true;
    }

    // TikTok-specific error code in the response body
    const tiktokErrorCode =
      error?.response?.data?.error?.code;

    if (tiktokErrorCode === TIKTOK_ERROR_CODES.ACCESS_TOKEN_INVALID) {
      return true;
    }

    return false;
  }
}
