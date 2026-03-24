import { Body, Controller, Logger, Post } from '@nestjs/common';
import { CanvaOauthService } from './canva-oauth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetUser, GetClientId } from 'src/decorators';
import { User } from '@prisma/client';
import { CanvaOauthCallbackDto } from './dto/canva-oauth-callback.dto';
import { EncryptionService } from 'src/shared/encryption/encryption.service';

@Controller('/auth/canva')
export class CanvaOauthController {
  private readonly logger = new Logger(CanvaOauthController.name);

  constructor(
    private readonly canvaOauthService: CanvaOauthService,
    private readonly prismaService: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * POST /auth/canva/callback
   * Receives the authorization code and PKCE code_verifier after the user
   * approves on Canva, exchanges for tokens, and stores them in SocialAccount.
   */
  @Post('callback')
  async handleCallback(
    @Body() body: CanvaOauthCallbackDto,
    @GetUser() user: User,
    @GetClientId() clientId: string,
  ) {
    // 1. Exchange code for tokens using the client-side PKCE code_verifier
    const tokenData = await this.canvaOauthService.exchangeCodeForToken(
      body.code,
      body.codeVerifier,
    );

    // 2. Fetch Canva user profile
    const profile = await this.canvaOauthService.getUserProfile(
      tokenData.access_token,
    );
    const canvaUser = profile.user;

    this.logger.log(
      `Canva user connected: ${canvaUser.display_name} (${canvaUser.user_id})`,
    );

    // 3. Encrypt tokens
    const encryptedAccessToken = this.encryptionService.encrypt(
      tokenData.access_token,
    );
    const encryptedRefreshToken = this.encryptionService.encrypt(
      tokenData.refresh_token,
    );

    // 4. Upsert SocialAccount
    await this.prismaService.socialAccount.upsert({
      where: {
        clientId_platform_platformUserId: {
          clientId,
          platform: 'CANVA',
          platformUserId: canvaUser.user_id,
        },
      },
      create: {
        userId: user.id,
        clientId,
        platform: 'CANVA',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        platformUserId: canvaUser.user_id,
        username: canvaUser.display_name,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        metadata: { profileUrl: canvaUser.profile_url ?? null },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        username: canvaUser.display_name,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        isActive: true,
        disconnectedAt: null,
        metadata: { profileUrl: canvaUser.profile_url ?? null },
      },
    });

    return { success: true };
  }
}
