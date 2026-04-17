import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly auth0Domain: string;
  private readonly auth0ClientId: string;
  private readonly auth0ClientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.auth0Domain = this.configService.get<string>('auth.auth0Domain')!;
    this.auth0ClientId = this.configService.get<string>('auth.auth0ClientId')!;
    this.auth0ClientSecret = this.configService.get<string>(
      'auth.auth0ClientSecret',
    )!;
  }

  /**
   * Get a Management API access token from Auth0 using client_credentials grant
   */
  private async getManagementToken(): Promise<string> {
    const response = await fetch(`https://${this.auth0Domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.auth0ClientId,
        client_secret: this.auth0ClientSecret,
        audience: `https://${this.auth0Domain}/api/v2/`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to get Management API token: ${error}`);
      throw new Error('Failed to get Auth0 Management API token');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Resend verification email via Auth0 Management API
   */
  async resendVerificationEmail(auth0UserId: string): Promise<void> {
    const token = await this.getManagementToken();

    const response = await fetch(
      `https://${this.auth0Domain}/api/v2/jobs/verification-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: auth0UserId,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to resend verification email: ${error}`);
      throw new Error('Failed to resend verification email');
    }

    this.logger.log(
      `Resent verification email for Auth0 user: ${auth0UserId}`,
    );
  }
}
