import { Body, Controller, Logger, Post, Inject } from '@nestjs/common';
import { TkOauthService } from './tk-oauth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetUser, GetClientId } from 'src/decorators';
import { User } from '@prisma/client';
import { TkOauthCallbackDto } from './dto/tk-oauth-callback.dto';
import { EncryptionService } from 'src/shared/encryption/encryption.service';
import { PlanService } from '../../../plans/plan.service';
import { ANALYTICS_PORT, AnalyticsPort } from 'src/analytics/analytics.port';

@Controller('/auth/tiktok')
export class TkOauthController {
  private readonly logger = new Logger(TkOauthController.name);
  constructor(
    private readonly tkOauthService: TkOauthService,
    private readonly prismaService: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly planService: PlanService,
    @Inject(ANALYTICS_PORT) private readonly analytics: AnalyticsPort,
  ) {}

  @Post('callback')
  async handleCallback(
    @Body() body: TkOauthCallbackDto,
    @GetUser() user: User,
    @GetClientId() clientId: string,
  ) {
    // 0. Check plan limit before connecting a new social account
    await this.planService.assertCanConnectSocialAccount(clientId, user.plan);

    // 1. Exchange the authorization code for tokens
    const tokenData = await this.tkOauthService.exchangeCodeForToken(body.code);

    // 2. Get TikTok user info
    const tiktokUser = await this.tkOauthService.getUserInfo(
      tokenData.access_token,
    );

    this.logger.log(tokenData);
    // 3. Crear o reactivar la cuenta social asociada al usuario y client actual
    const encryptedAccessToken = this.encryptionService.encrypt(
      tokenData.access_token,
    );
    const encryptedRefreshToken = this.encryptionService.encrypt(
      tokenData.refresh_token,
    );
    await this.prismaService.socialAccount.upsert({
      where: {
        clientId_platform_platformUserId: {
          clientId,
          platform: 'TIKTOK',
          platformUserId: tokenData.open_id,
        },
      },
      create: {
        userId: user.id,
        clientId,
        platform: 'TIKTOK',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        platformUserId: tokenData.open_id,
        username: tiktokUser.display_name,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        refreshExpiresAt: new Date(
          Date.now() + tokenData.refresh_expires_in * 1000,
        ),
        metadata: { profilePictureUrl: tiktokUser.avatar_url ?? null },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        username: tiktokUser.display_name,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        refreshExpiresAt: new Date(
          Date.now() + tokenData.refresh_expires_in * 1000,
        ),
        isActive: true,
        disconnectedAt: null,
        metadata: { profilePictureUrl: tiktokUser.avatar_url ?? null },
      },
    });

    this.analytics
      .track({
        event: 'Social Account Connected',
        userId: user.email,
        properties: { platform: 'TIKTOK', username: tiktokUser.display_name },
      })
      .catch(() => {});

    return { success: true };
  }
}
