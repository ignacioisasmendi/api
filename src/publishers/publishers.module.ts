import { Module } from '@nestjs/common';
import { InstagramPublisher } from './instagram.publisher';
import { FacebookPublisher } from './facebook.publisher';
import { TikTokPublisher } from './tiktok.publisher';
import { XPublisher } from './x.publisher';
import { PublisherFactory } from './publisher.factory';
import { PrismaService } from '../prisma/prisma.service';
import { TiktokModule } from '../tiktok/tiktok.module';

@Module({
  imports: [TiktokModule],
  providers: [
    PrismaService,
    InstagramPublisher,
    FacebookPublisher,
    TikTokPublisher,
    XPublisher,
    PublisherFactory,
  ],
  exports: [PublisherFactory],
})
export class PublishersModule {}
