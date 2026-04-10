import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface TikTokRefreshTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  token_type: string;
}

@Injectable()
export class TkOauthService {
  private readonly logger = new Logger(TkOauthService.name);

  private clientKey: string;
  private clientSecret: string;
  private callbackUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.clientKey = configService.get('tiktok.clientKey')!;
    this.clientSecret = configService.get('tiktok.clientSecret')!;
    this.callbackUrl = configService.get('tiktok.callbackUrl')!;
  }

  async exchangeCodeForToken(code: string) {
    try {
      const form = new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.callbackUrl,
        code,
      });

      const { data } = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        form.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      this.logger.log(data);
      return data;
    } catch (error) {
      this.logger.error('TikTok token exchange failed');

      if (axios.isAxiosError(error)) {
        this.logger.error(`Status: ${error.response?.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response?.data)}`);
      } else {
        this.logger.error(error);
      }

      throw error;
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TikTokRefreshTokenResponse> {
    const form = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const { data } = await axios.post<TikTokRefreshTokenResponse>(
      'https://open.tiktokapis.com/v2/oauth/token/',
      form.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return data;
  }

  async getUserInfo(accessToken: string) {
    try {
      const { data } = await axios.get(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return data.data.user;
    } catch (error) {
      this.logger.error('TikTok get user info failed');

      if (axios.isAxiosError(error)) {
        this.logger.error(`Status: ${error.response?.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response?.data)}`);
      } else {
        this.logger.error(error);
      }

      throw error;
    }
  }
}
