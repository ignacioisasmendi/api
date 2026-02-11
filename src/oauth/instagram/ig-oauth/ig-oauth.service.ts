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

    this.logger.log('Instagram OAuth service initialized');
  }
  
  async exchangeCodeForToken(code: string) {
    try {
      const form = new URLSearchParams({
        client_id: this.instagramAppId,
        client_secret: this.instagramAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.instagramCallbackUrl,
        code
      });
    
      const { data } = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        form.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    
      return data;
    } catch (error) {
      this.logger.error('Instagram token exchange failed');

      if (axios.isAxiosError(error)) {
        this.logger.error(`Status: ${error.response?.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response?.data)}`);
        throw new Error(`Instagram OAuth failed: ${error.response?.data?.error_message || error.message}`);
      }
      
      throw error;
    }
  }

  async getUserInfo(accessToken: string) {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    );
    return await response.json();
  }
}
