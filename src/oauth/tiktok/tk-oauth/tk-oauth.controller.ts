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
    const tiktokUser = await this.tkOauthService.getUserInfo(tokenData.access_token);

    // 3. Save the social account in DB associated with the current user and client
    await this.prismaService.socialAccount.create({
      data: {
        userId: user.id,
        clientId,
        platform: 'TIKTOK',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        platformUserId: tokenData.open_id,
        username: tiktokUser.display_name,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000), // 24 hours
      },
    });

    return { success: true };
  }
}
