import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
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
    this.logger.debug(
      `[handleCallback] START — userId=${user?.id}, clientId=${clientId}, ` +
        `code=${body.code?.substring(0, 8)}…, codeVerifier length=${body.codeVerifier?.length}`,
    );

    // 1. Exchange code for tokens using the client-side PKCE code_verifier
    let tokenData: Awaited<
      ReturnType<CanvaOauthService['exchangeCodeForToken']>
    >;
    try {
      tokenData = await this.canvaOauthService.exchangeCodeForToken(
        body.code,
        body.codeVerifier,
      );
      this.logger.debug(
        `[handleCallback] Token exchange OK — expires_in=${tokenData.expires_in}, ` +
          `scopes=${tokenData.scope}, has_refresh=${!!tokenData.refresh_token}`,
      );
    } catch (error) {
      this.logger.error(
        `[handleCallback] FAILED at step 1 (token exchange): ${error?.message ?? error}`,
      );
      this.logger.error(error?.stack ?? error);
      throw new HttpException(
        {
          message: 'Failed to exchange Canva authorization code for tokens',
          step: 'token_exchange',
          detail: error?.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // 2. Fetch Canva user profile
    let canvaUser: { user_id: string; display_name: string; profile_url: string };
    try {
      const profile = await this.canvaOauthService.getUserProfile(
        tokenData.access_token,
      );
      this.logger.debug(
        `[handleCallback] Profile response: ${JSON.stringify(profile)}`,
      );

      if (!profile?.profile) {
        throw new Error(
          `Canva profile response missing "profile" field. Got keys: ${Object.keys(profile ?? {}).join(', ')}`,
        );
      }
      canvaUser = profile.profile;

      this.logger.debug(
        `[handleCallback] Canva user — id=${canvaUser.user_id}, name=${canvaUser.display_name}`,
      );
    } catch (error) {
      this.logger.error(
        `[handleCallback] FAILED at step 2 (user profile): ${error?.message ?? error}`,
      );
      this.logger.error(error?.stack ?? error);
      throw new HttpException(
        {
          message: 'Failed to fetch Canva user profile',
          step: 'user_profile',
          detail: error?.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // 3. Encrypt tokens
    let encryptedAccessToken: string;
    let encryptedRefreshToken: string;
    try {
      encryptedAccessToken = this.encryptionService.encrypt(
        tokenData.access_token,
      )!;
      encryptedRefreshToken = this.encryptionService.encrypt(
        tokenData.refresh_token,
      )!;
      this.logger.debug('[handleCallback] Tokens encrypted OK');
    } catch (error) {
      this.logger.error(
        `[handleCallback] FAILED at step 3 (encryption): ${error?.message ?? error}`,
      );
      this.logger.error(error?.stack ?? error);
      throw new HttpException(
        {
          message: 'Failed to encrypt Canva tokens',
          step: 'encryption',
          detail: error?.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 4. Upsert SocialAccount
    try {
      this.logger.debug(
        `[handleCallback] Upserting SocialAccount — clientId=${clientId}, ` +
          `platform=CANVA, platformUserId=${canvaUser.user_id}`,
      );

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

      this.logger.debug('[handleCallback] SocialAccount upserted OK');
    } catch (error) {
      this.logger.error(
        `[handleCallback] FAILED at step 4 (upsert): ${error?.message ?? error}`,
      );
      this.logger.error(error?.stack ?? error);
      throw new HttpException(
        {
          message: 'Failed to save Canva account',
          step: 'upsert',
          detail: error?.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(
      `[handleCallback] SUCCESS — Canva account connected for user ${user.id} (${canvaUser.display_name})`,
    );
    return { success: true };
  }
}
