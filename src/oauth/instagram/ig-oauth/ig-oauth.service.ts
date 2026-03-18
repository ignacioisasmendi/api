import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class IgOauthService {
  private readonly logger = new Logger(IgOauthService.name);
  private instagramAppId: string;
  private instagramAppSecret: string;
  private instagramCallbackUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.instagramAppId = configService.get('instagram.appId')!;
    this.instagramAppSecret = configService.get('instagram.appSecret')!;
    this.instagramCallbackUrl = configService.get('instagram.callbackUrl')!;

    this.logger.log(`Instagram OAuth service initialized — callbackUrl: ${this.instagramCallbackUrl}`);
  }

  async exchangeCodeForToken(code: string) {
    try {
      this.logger.log('========== INSTAGRAM TOKEN EXCHANGE DEBUG START ==========');
      this.logger.log(`redirect_uri value: "${this.instagramCallbackUrl}"`);
      this.logger.log(`redirect_uri type: ${typeof this.instagramCallbackUrl}`);
      this.logger.log(`redirect_uri length: ${this.instagramCallbackUrl?.length}`);
      this.logger.log(`redirect_uri trimmed: "${this.instagramCallbackUrl?.trim()}"`);
      this.logger.log(`redirect_uri charCodes: [${Array.from(this.instagramCallbackUrl || '').map(c => c.charCodeAt(0)).join(', ')}]`);
      this.logger.log(`client_id value: "${this.instagramAppId}"`);
      this.logger.log(`client_id type: ${typeof this.instagramAppId}`);
      this.logger.log(`code value: "${code}"`);
      this.logger.log(`code length: ${code?.length}`);
      this.logger.log(`ENV raw INSTAGRAM_CALLBACK_URL: "${process.env.INSTAGRAM_CALLBACK_URL}"`);
      this.logger.log(`ENV raw type: ${typeof process.env.INSTAGRAM_CALLBACK_URL}`);
      this.logger.log(`ConfigService value: "${this.configService.get('instagram.callbackUrl')}"`);
      this.logger.log(`Expected: "https://app.planer.com.ar/auth/instagram/callback"`);
      this.logger.log(`Match? ${this.instagramCallbackUrl === 'https://app.planer.com.ar/auth/instagram/callback'}`);

      const form = new URLSearchParams({
        client_id: this.instagramAppId,
        client_secret: this.instagramAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.instagramCallbackUrl,
        code,
      });

      this.logger.log(`Full form body: ${form.toString()}`);
      this.logger.log('========== SENDING REQUEST TO INSTAGRAM ==========');

      const { data } = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        form.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      this.logger.log('========== INSTAGRAM TOKEN EXCHANGE SUCCESS ==========');
      return data;
    } catch (error) {
      this.logger.error('========== INSTAGRAM TOKEN EXCHANGE FAILED ==========');
      this.logger.error(`redirect_uri used: "${this.instagramCallbackUrl}"`);
      this.logger.error(`ENV raw INSTAGRAM_CALLBACK_URL: "${process.env.INSTAGRAM_CALLBACK_URL}"`);

      if (axios.isAxiosError(error)) {
        this.logger.error(`HTTP Status: ${error.response?.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response?.data, null, 2)}`);
        this.logger.error(`Request URL: ${error.config?.url}`);
        this.logger.error(`Request body: ${error.config?.data}`);
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
      this.logger.log('========== LONG-LIVED TOKEN EXCHANGE DEBUG START ==========');
      this.logger.log(`short-lived token length: ${shortLivedToken?.length}`);
      this.logger.log(`short-lived token prefix: "${shortLivedToken?.substring(0, 20)}..."`);
      this.logger.log(`client_secret set: ${!!this.instagramAppSecret}`);
      this.logger.log(`client_secret length: ${this.instagramAppSecret?.length}`);

      const form = new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: this.instagramAppSecret,
        access_token: shortLivedToken,
      });

      const { data } = await axios.post(
        'https://graph.instagram.com/access_token',
        form.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15_000,
        },
      );

      this.logger.log('========== LONG-LIVED TOKEN EXCHANGE SUCCESS ==========');
      this.logger.log(`long-lived token length: ${data?.access_token?.length}`);
      this.logger.log(`expires_in: ${data?.expires_in}`);
      return data;
    } catch (error) {
      this.logger.error('========== LONG-LIVED TOKEN EXCHANGE FAILED ==========');
      if (axios.isAxiosError(error)) {
        this.logger.error(`HTTP Status: ${error.response?.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response?.data, null, 2)}`);
        this.logger.error(`Request URL: ${error.config?.url}`);
        this.logger.error(`Request params: ${JSON.stringify(error.config?.params, null, 2)}`);
        throw new Error(
          `Long-lived token exchange failed: ${error.response?.data?.error?.message || error.message}`,
        );
      }
      this.logger.error(`Non-Axios error: ${error instanceof Error ? error.message : String(error)}`);
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
