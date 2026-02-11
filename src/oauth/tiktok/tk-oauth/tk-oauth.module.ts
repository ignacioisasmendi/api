import { Module } from '@nestjs/common';
import { TkOauthService } from './tk-oauth.service';
import { TkOauthController } from './tk-oauth.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TkOauthController],
  providers: [TkOauthService, PrismaService],
})
export class TkOauthModule {}
