import { Body, Controller, Post } from '@nestjs/common';
import { TkOauthService } from './tk-oauth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetUser, GetClientId } from 'src/decorators';
import { User } from '@prisma/client';
import { TkOauthCallbackDto } from './dto/tk-oauth-callback.dto';

@Controller('/auth/tiktok')
export class TkOauthController {
  constructor(
    private readonly tkOauthService: TkOauthService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post('callback')
  async handleCallback(
    @Body() body: TkOauthCallbackDto,
    @GetUser() user: User,
    @GetClientId() clientId: string,
  ) {
    // 1. Exchange the authorization code for tokens
    const tokenData = await this.tkOauthService.exchangeCodeForToken(body.code);

    // 2. Get TikTok user info
    const tiktokUser = await this.tkOauthService.getUserInfo(
      tokenData.access_token,
    );

    // 3. Crear o reactivar la cuenta social asociada al usuario y client actual
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
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        platformUserId: tokenData.open_id,
        username: tiktokUser.display_name,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        username: tiktokUser.display_name,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        isActive: true,
        disconnectedAt: null,
      },
    });

    return { success: true };
  }
}
