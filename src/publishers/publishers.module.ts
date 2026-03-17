import { Module } from '@nestjs/common';
import { InstagramPublisher } from './instagram.publisher';
import { FacebookPublisher } from './facebook.publisher';
import { TikTokPublisher } from './tiktok.publisher';
import { XPublisher } from './x.publisher';
import { PublisherFactory } from './publisher.factory';
import { PrismaService } from '../prisma/prisma.service';
import { TiktokModule } from '../tiktok/tiktok.module';
import { IgRateLimitService } from './ig-rate-limit.service';

@Module({
  imports: [TiktokModule],
  providers: [
    PrismaService,
    IgRateLimitService,
    InstagramPublisher,
    FacebookPublisher,
    TikTokPublisher,
    XPublisher,
    PublisherFactory,
  ],
  exports: [PublisherFactory, IgRateLimitService],
})
export class PublishersModule {}
