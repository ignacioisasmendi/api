import { Module } from '@nestjs/common';
import { IgOauthService } from './ig-oauth.service';
import { IgOauthController } from './ig-oauth.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [IgOauthController],
  providers: [IgOauthService, PrismaService],
})
export class IgOauthModule {}
