import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { PublicationModule } from '../publications/publication.module';
import { PublishersModule } from '../publishers/publishers.module';
import { ShareLinkCronService } from './share-link-cron.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [PublicationModule, PublishersModule],
  controllers: [CronController],
  providers: [CronService, ShareLinkCronService, PrismaService],
})
export class CronModule {}
