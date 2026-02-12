import { Module } from '@nestjs/common';
import { PublicShareController } from './public-share.controller';
import { PublicShareService } from './public-share.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShareLinkModule } from '../share-links/share-link.module';

@Module({
  imports: [ShareLinkModule],
  controllers: [PublicShareController],
  providers: [PublicShareService, PrismaService],
})
export class PublicShareModule {}
