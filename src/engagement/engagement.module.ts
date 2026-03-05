import { Module } from '@nestjs/common';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramInsightsModule } from '../instagram-insights/instagram-insights.module';

@Module({
  imports: [InstagramInsightsModule],
  controllers: [EngagementController],
  providers: [EngagementService, PrismaService],
})
export class EngagementModule {}
