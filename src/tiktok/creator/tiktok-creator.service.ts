import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TIKTOK_ENDPOINTS } from '../tiktok.constants';
import { CreatorInfoResponse, CreatorInfoData } from '../tiktok.types';

/**
 * Service responsible for querying TikTok creator account capabilities.
 *
 * Before publishing, the caller should check which privacy levels the
 * creator supports and whether comment / duet / stitch are disabled at
 * the account level.
 *
 * Endpoint: POST /v2/post/publish/creator_info/query/
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 */
@Injectable()
export class TiktokCreatorService {
  private readonly logger = new Logger(TiktokCreatorService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('tiktok.apiUrl')!;
  }

  /**
   * Query the authenticated creator's posting capabilities.
   *
   * @param accessToken - Valid OAuth access_token for the TikTok user.
   * @returns Creator info including supported privacy levels and
   *          comment / duet / stitch availability.
   */
  async queryCreatorInfo(accessToken: string): Promise<CreatorInfoData> {
    const url = `${this.apiUrl}${TIKTOK_ENDPOINTS.CREATOR_INFO}`;

    this.logger.log('Querying TikTok creator info');

    try {
      const { data: response } = await firstValueFrom(
        this.httpService.post<CreatorInfoResponse>(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
          },
        ),
      );

      if (response.error.code !== 'ok') {
        this.logger.error(
          { tiktokError: response.error },
          `TikTok creator info query failed: ${response.error.code} – ${response.error.message}`,
        );
        throw new Error(
          `TikTok API error: ${response.error.code} – ${response.error.message}`,
        );
      }

      this.logger.log(
        `Creator supports privacy levels: ${response.data.privacy_level_options.join(', ')}`,
      );

      return response.data;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('TikTok API error')
      ) {
        throw error;
      }
      this.logger.error({ err: error }, 'Failed to query TikTok creator info');
      throw new Error(
        `Failed to query TikTok creator info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
