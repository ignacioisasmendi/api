import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { PublicationModule } from '../publications/publication.module';
import { PublishersModule } from '../publishers/publishers.module';
import { ShareLinkCronService } from './share-link-cron.service';
import { TkTokenRefreshCronService } from './tk-token-refresh-cron.service';
import { TkOauthModule } from '../oauth/tiktok/tk-oauth/tk-oauth.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [PublicationModule, PublishersModule, TkOauthModule],
  controllers: [CronController],
  providers: [CronService, ShareLinkCronService, TkTokenRefreshCronService, PrismaService],
})
export class CronModule {}
