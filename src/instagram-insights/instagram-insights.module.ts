import { Module } from '@nestjs/common';
import { InstagramInsightsController } from './instagram-insights.controller';
import { InstagramInsightsService } from './instagram-insights.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [InstagramInsightsController],
  providers: [InstagramInsightsService, PrismaService],
  exports: [InstagramInsightsService],
})
export class InstagramInsightsModule {}
