import { Module } from '@nestjs/common';
import { AnalyticsReportController } from './analytics-report.controller';
import { AnalyticsReportService } from './analytics-report.service';
import { InstagramInsightsModule } from '../instagram-insights/instagram-insights.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [InstagramInsightsModule],
  controllers: [AnalyticsReportController],
  providers: [AnalyticsReportService, PrismaService],
})
export class AnalyticsReportModule {}
