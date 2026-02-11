import { Module } from '@nestjs/common';
import { PublicationController, InstagramPublicationController, FacebookPublicationController, TikTokPublicationController, XPublicationController } from './publication.controller';
import { PublicationService } from './publication.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishersModule } from '../publishers/publishers.module';

@Module({
  imports: [PublishersModule],
  controllers: [
    PublicationController,
    InstagramPublicationController,
    FacebookPublicationController,
    TikTokPublicationController,
    XPublicationController,
  ],
  providers: [PublicationService, PrismaService],
  exports: [PublicationService],
})
export class PublicationModule {}
