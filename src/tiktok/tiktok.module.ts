import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TiktokCreatorService } from './creator/tiktok-creator.service';
import { TiktokPostService } from './post/tiktok-post.service';
import { TiktokController } from './tiktok.controller';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TiktokModule encapsulates all TikTok Content Posting API logic.
 *
 * Controllers:
 * - TiktokController      – REST endpoints for creator info, init post, video upload.
 *
 * Exports:
 * - TiktokCreatorService  – query creator capabilities.
 * - TiktokPostService     – init posts, upload videos, refresh tokens.
 *
 * Imported by PublishersModule so TikTokPublisher can inject the services.
 */
@Module({
  imports: [
    HttpModule.register({
      // Generous timeout for large video uploads
      timeout: 120_000,
      maxRedirects: 5,
    }),
  ],
  controllers: [TiktokController],
  providers: [TiktokCreatorService, TiktokPostService, PrismaService],
  exports: [TiktokCreatorService, TiktokPostService],
})
export class TiktokModule {}
