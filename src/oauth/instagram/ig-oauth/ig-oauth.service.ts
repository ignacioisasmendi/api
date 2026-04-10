import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class IgOauthService {
  private readonly logger = new Logger(IgOauthService.name);
  private instagramAppId: string;
  private instagramAppSecret: string;
  private instagramCallbackUrl: string;

  constructor(configService: ConfigService) {
    this.instagramAppId = configService.get('instagram.appId')!;
    this.instagramAppSecret = configService.get('instagram.appSecret')!;
    this.instagramCallbackUrl = configService.get('instagram.callbackUrl')!;

    this.logger.log(
      `Instagram OAuth service initialized — callbackUrl: ${this.instagramCallbackUrl}`,
    );
  }

  async exchangeCodeForToken(code: string) {
    const form = new URLSearchParams({
      client_id: this.instagramAppId,
      client_secret: this.instagramAppSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.instagramCallbackUrl,
      code,
    });

    try {
      const { data } = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        form.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      this.logger.log('Instagram short-lived token exchange succeeded');
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error('Instagram short-lived token exchange failed', {
          status: error.response?.status,
          response: error.response?.data,
          redirect_uri: this.instagramCallbackUrl,
          client_id: this.instagramAppId,
          code_length: code?.length,
        });
        throw new Error(
          `Instagram OAuth failed: ${error.response?.data?.error_message || error.message}`,
        );
      }
      throw error;
    }
  }

  async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    try {
      const { data } = await axios.get(
        'https://graph.instagram.com/access_token',
        {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: this.instagramAppSecret,
            access_token: shortLivedToken,
          },
          timeout: 15_000,
        },
      );

      this.logger.log('Instagram long-lived token exchange succeeded', {
        token_length: data?.access_token?.length,
        expires_in: data?.expires_in,
      });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error('Instagram long-lived token exchange failed', {
          status: error.response?.status,
          response: error.response?.data,
          short_lived_token_length: shortLivedToken?.length,
          client_secret_set: !!this.instagramAppSecret,
        });
        throw new Error(
          `Long-lived token exchange failed: ${error.response?.data?.error?.message || error.message}`,
        );
      }
      this.logger.error(
        'Instagram long-lived token exchange failed (non-HTTP)',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async getUserInfo(accessToken: string) {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${accessToken}`,
      );

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          { status: response.status, body: errorBody },
          `Instagram getUserInfo failed: HTTP ${response.status}`,
        );
        throw new Error(
          `Instagram getUserInfo failed: HTTP ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Instagram getUserInfo')
      ) {
        throw error;
      }
      this.logger.error({ err: error }, 'Failed to fetch Instagram user info');
      throw new Error(
        `Failed to fetch Instagram user info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
