import { Module } from '@nestjs/common';
import { CanvaOauthService } from './canva-oauth.service';
import { CanvaOauthController } from './canva-oauth.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CanvaOauthController],
  providers: [CanvaOauthService, PrismaService],
  exports: [CanvaOauthService],
})
export class CanvaOauthModule {}
