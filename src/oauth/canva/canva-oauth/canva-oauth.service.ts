import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CanvaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface CanvaUserData {
  user_id: string;
  display_name: string;
  profile_url: string;
}

export interface CanvaUserProfile {
  user?: CanvaUserData;
  team_user?: CanvaUserData & { team_id: string };
}

@Injectable()
export class CanvaOauthService {
  private readonly logger = new Logger(CanvaOauthService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly tokenUrl: string;
  private readonly profileUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = configService.get('canva.clientId')!;
    this.clientSecret = configService.get('canva.clientSecret')!;
    this.callbackUrl = configService.get('canva.callbackUrl')!;
    this.tokenUrl = configService.get('canva.tokenUrl')!;
    this.profileUrl = configService.get('canva.profileUrl')!;
  }

  /**
   * Exchange authorization code for tokens.
   * The codeVerifier is generated client-side (PKCE) and forwarded here.
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Promise<CanvaTokenResponse> {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.callbackUrl,
      code_verifier: codeVerifier,
    });

    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    try {
      const { data } = await axios.post<CanvaTokenResponse>(
        this.tokenUrl,
        form.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`,
          },
        },
      );
      return data;
    } catch (error) {
      this.logger.error('Canva token exchange failed');
      if (axios.isAxiosError(error)) {
        this.logger.error(`Status: ${error.response?.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response?.data)}`);
      } else {
        this.logger.error(error);
      }
      throw error;
    }
  }

  /** Fetch the authenticated user's Canva profile */
  async getUserProfile(accessToken: string): Promise<CanvaUserProfile> {
    try {
      const { data } = await axios.get<CanvaUserProfile>(this.profileUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    } catch (error) {
      this.logger.error('Canva get user profile failed');
      if (axios.isAxiosError(error)) {
        this.logger.error(`Status: ${error.response?.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response?.data)}`);
      } else {
        this.logger.error(error);
      }
      throw error;
    }
  }

  /**
   * Refresh a Canva access token.
   * NOTE: Canva uses rotating refresh tokens (single-use). The caller
   * MUST persist the new refresh_token returned in the response.
   */
  async refreshAccessToken(refreshToken: string): Promise<CanvaTokenResponse> {
    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const { data } = await axios.post<CanvaTokenResponse>(
      this.tokenUrl,
      form.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      },
    );
    return data;
  }
}
