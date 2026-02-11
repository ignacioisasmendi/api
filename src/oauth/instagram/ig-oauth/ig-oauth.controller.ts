import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { IgOauthService } from './ig-oauth.service';
import { IsPublic } from 'src/decorators/public.decorator';
import type { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetUser } from 'src/decorators';
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
    @GetUser() user: User
  ) {
    // 1. Validar el state para prevenir CSRF
    // 2. Intercambiar el código por un access token
    const tokenData = await this.igOauthService.exchangeCodeForToken(body.code);
    
    // 3. Obtener información del usuario de Instagram
    const instagramUser = await this.igOauthService.getUserInfo(tokenData.access_token);
    
    // 4. Guardar el access token en tu DB asociado al usuario actual
    await this.prismaService.socialAccount.create({
      data: {
        userId: user.id,
        platform: 'INSTAGRAM',
        accessToken: tokenData.access_token,
        platformUserId: instagramUser.id,
        username: instagramUser.username,
        expiresAt: new Date(Date.now() + 3600 * 1000 * 24 * 60) // 60 dias
      }
    }); 
    
    return { success: true };
  }
}
