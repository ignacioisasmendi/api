import { Injectable, BadRequestException } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { IPlatformPublisher } from './interfaces/platform-publisher.interface';
import { InstagramPublisher } from './instagram.publisher';
import { FacebookPublisher } from './facebook.publisher';
import { TikTokPublisher } from './tiktok.publisher';
import { XPublisher } from './x.publisher';

@Injectable()
export class PublisherFactory {
  constructor(
    private readonly instagramPublisher: InstagramPublisher,
    private readonly facebookPublisher: FacebookPublisher,
    private readonly tiktokPublisher: TikTokPublisher,
    private readonly xPublisher: XPublisher,
  ) {}

  getPublisher(platform: Platform): IPlatformPublisher {
    switch (platform) {
      case Platform.INSTAGRAM:
        return this.instagramPublisher;
      case Platform.FACEBOOK:
        return this.facebookPublisher;
      case Platform.TIKTOK:
        return this.tiktokPublisher;
      case Platform.X:
        return this.xPublisher;
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }
}
