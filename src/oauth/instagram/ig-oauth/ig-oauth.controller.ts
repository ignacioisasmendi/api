import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { IgOauthService } from './ig-oauth.service';
import { IsPublic } from 'src/decorators/public.decorator';
import type { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetUser, GetClientId } from 'src/decorators';
import { User } from '@prisma/client';
import { IgOauthCallbackDto } from './dto/ig-oauth-callback.dto';

@Controller('/auth/instagram')
export class IgOauthController {
  constructor(
    private readonly igOauthService: IgOauthService,
    private readonly prismaService: PrismaService,
  ) {}
  /* 
  @Get('callback')
  async callbackAuth(@Query('code') code: string, @Res() res: Response) {
    const response = await this.igOauthService.exchangeCodeForToken(code);
    
    return res.redirect(`http://localhost:3000/dashboard`);

  } */

  @Post('callback')
  async handleCallback(
    @Body() body: IgOauthCallbackDto,
    @GetUser() user: User,
    @GetClientId() clientId: string,
  ) {
    // 1. Exchange the authorization code for a short-lived token
    const tokenData = await this.igOauthService.exchangeCodeForToken(body.code);

    console.log('tokenData', tokenData);

    // 2. Exchange short-lived token for a long-lived token (~60 days)
    const longLived = await this.igOauthService.exchangeForLongLivedToken(
      tokenData.access_token,
    );

    console.log('longLived', longLived);
    // 3. Get Instagram user info using the long-lived token
    const instagramUser = await this.igOauthService.getUserInfo(
      longLived.access_token,
    );

    // 4. Compute expiry from the API response (expires_in is in seconds)
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);

    // 5. Create or reactivate the social account
    await this.prismaService.socialAccount.upsert({
      where: {
        clientId_platform_platformUserId: {
          clientId,
          platform: 'INSTAGRAM',
          platformUserId: instagramUser.id,
        },
      },
      create: {
        userId: user.id,
        clientId,
        platform: 'INSTAGRAM',
        accessToken: longLived.access_token,
        platformUserId: instagramUser.id,
        username: instagramUser.username,
        expiresAt,
      },
      update: {
        accessToken: longLived.access_token,
        username: instagramUser.username,
        expiresAt,
        isActive: true,
        disconnectedAt: null,
      },
    });

    return { success: true };
  }
}
