import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InstagramInsightsService } from '../instagram-insights/instagram-insights.service';
import { StorageService } from '../shared/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfBuilder } from './pdf/pdf-builder';
import { generateLineChart } from './pdf/chart-generator';
import { GenerateReportDto } from './analytics-report.dto';
import {
  DailyMetric,
  ReportCharts,
  ReportData,
  ReportMetrics,
  TopPost,
} from './interfaces/report.interfaces';
import { MediaItem } from '../instagram-insights/instagram-insights.service';

interface IgDailyValue {
  value: number;
  end_time: string;
}

interface IgDailyMetric {
  name: string;
  period: string;
  values: IgDailyValue[];
}

interface IgInsightsResponse {
  data: IgDailyMetric[];
}

interface DailyTimeSeries {
  impressions: DailyMetric[];
  reach: DailyMetric[];
  followerStart: number;
  followerEnd: number;
}

@Injectable()
export class AnalyticsReportService {
  private readonly logger = new Logger(AnalyticsReportService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly insightsService: InstagramInsightsService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl =
      this.configService.get<string>('instagram.apiUrl') ??
      'https://graph.instagram.com/v24.0';
  }

  async generate(
    dto: GenerateReportDto,
    clientId: string,
  ): Promise<{ downloadUrl: string }> {
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);

    if (dateFrom >= dateTo) {
      throw new BadRequestException('dateFrom must be before dateTo');
    }

    const diffDays = (dateTo.getTime() - dateFrom.getTime()) / 86_400_000;
    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }

    // Verify ownership and get token
    const { token, platformUserId } = await this.insightsService.getValidToken(
      dto.socialAccountId,
      clientId,
    );

    // Fetch social account metadata (username, platform)
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: dto.socialAccountId, clientId },
      select: { username: true, platform: true },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    const period = diffDays <= 9 ? '7d' : '30d';

    // Parallel data fetching
    const [insights, mediaData, timeSeries] = await Promise.all([
      this.insightsService.getAccountInsights(dto.socialAccountId, clientId, period),
      this.insightsService.getMediaWithInsights(dto.socialAccountId, clientId),
      this.fetchDailyTimeSeries(platformUserId, token, dateFrom, dateTo),
    ]);

    const reportData = this.buildReportData(
      { username: account.username ?? 'unknown', platform: account.platform },
      insights,
      mediaData.data,
      timeSeries,
      dateFrom,
      dateTo,
    );

    // Generate charts in parallel
    const [impressionsChart, reachChart] = await Promise.all([
      generateLineChart(reportData.dailyImpressions, 'Impressions', '#6366F1'),
      generateLineChart(reportData.dailyReach, 'Reach', '#8B5CF6'),
    ]);

    const charts: ReportCharts = {
      impressions: impressionsChart ?? undefined,
      reach: reachChart ?? undefined,
    };

    // Generate PDF
    const builder = new PdfBuilder();
    const pdfBuffer = await builder.build(reportData, charts);

    // Upload to R2
    const key = `reports/${clientId}/${dto.socialAccountId}/${Date.now()}_analytics_report.pdf`;
    await this.storageService.uploadFile(key, pdfBuffer, 'application/pdf');

    // Return 24-hour signed URL
    const downloadUrl = await this.storageService.getSignedUrl(key, 86_400);

    this.logger.log(
      { key, clientId, socialAccountId: dto.socialAccountId },
      'Analytics report generated and uploaded',
    );

    return { downloadUrl };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async fetchDailyTimeSeries(
    platformUserId: string,
    token: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<DailyTimeSeries> {
    const since = Math.floor(dateFrom.getTime() / 1000);
    const until = Math.floor(dateTo.getTime() / 1000);

    const params = new URLSearchParams({
      metric: 'views,reach,follower_count',
      period: 'day',
      since: String(since),
      until: String(until),
      access_token: token,
    });

    try {
      const url = `${this.apiUrl}/${platformUserId}/insights?${params.toString()}`;
      const { data } = await axios.get<IgInsightsResponse>(url);
      return this.parseTimeSeries(data.data);
    } catch (error) {
      this.logger.warn(
        { err: error, platformUserId },
        'Failed to fetch daily time-series — charts will be skipped',
      );
      return { impressions: [], reach: [], followerStart: 0, followerEnd: 0 };
    }
  }

  private parseTimeSeries(metrics: IgDailyMetric[]): DailyTimeSeries {
    const result: DailyTimeSeries = {
      impressions: [],
      reach: [],
      followerStart: 0,
      followerEnd: 0,
    };

    for (const metric of metrics) {
      const values = metric.values ?? [];
      const mapped: DailyMetric[] = values.map((v) => ({
        date: new Date(v.end_time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        value: v.value ?? 0,
      }));

      if (metric.name === 'views' || metric.name === 'impressions') {
        result.impressions = mapped;
      } else if (metric.name === 'reach') {
        result.reach = mapped;
      } else if (metric.name === 'follower_count') {
        result.followerStart = values[0]?.value ?? 0;
        result.followerEnd = values[values.length - 1]?.value ?? 0;
      }
    }

    return result;
  }

  private buildReportData(
    account: { username: string; platform: string },
    insights: { impressions: number; reach: number; profileViews: number; followerCount: number },
    posts: MediaItem[],
    timeSeries: DailyTimeSeries,
    dateFrom: Date,
    dateTo: Date,
  ): ReportData {
    const totalLikes = posts.reduce((s, p) => s + p.insights.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.insights.comments, 0);
    const totalShares = posts.reduce((s, p) => s + p.insights.shares, 0);
    const totalSaves = posts.reduce((s, p) => s + p.insights.saved, 0);

    const totalEngagements = totalLikes + totalComments + totalSaves;
    const engagementRate =
      insights.reach > 0 ? (totalEngagements / insights.reach) * 100 : 0;

    const followerEnd = timeSeries.followerEnd || insights.followerCount;
    const followerStart = timeSeries.followerStart;
    const followerGrowthPct =
      followerStart > 0
        ? ((followerEnd - followerStart) / followerStart) * 100
        : 0;

    const topPosts: TopPost[] = posts
      .map((p) => ({
        id: p.id,
        caption: p.caption ?? '',
        mediaType: p.mediaType,
        mediaUrl: p.mediaUrl,
        timestamp: p.timestamp,
        likes: p.insights.likes,
        comments: p.insights.comments,
        reach: p.insights.reach,
        impressions: p.insights.impressions,
        saves: p.insights.saved,
        shares: p.insights.shares,
        engagementRate:
          p.insights.reach > 0
            ? ((p.insights.likes + p.insights.comments + p.insights.saved) /
                p.insights.reach) *
              100
            : 0,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10);

    const metrics: ReportMetrics = {
      impressions: insights.impressions,
      reach: insights.reach,
      profileViews: insights.profileViews,
      followerCount: followerEnd,
      followerStart,
      followerGrowthPct,
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      engagementRate,
    };

    const reportData: ReportData = {
      account: { username: account.username, platform: String(account.platform) },
      dateFrom,
      dateTo,
      metrics,
      dailyImpressions: timeSeries.impressions,
      dailyReach: timeSeries.reach,
      topPosts,
      bestPost: topPosts[0] ?? null,
      recommendations: [],
    };

    reportData.recommendations = this.generateRecommendations(reportData);

    return reportData;
  }

  private generateRecommendations(data: ReportData): string[] {
    const recs: string[] = [];
    const { metrics, topPosts } = data;
    const daysDiff = Math.max(
      1,
      Math.ceil(
        (data.dateTo.getTime() - data.dateFrom.getTime()) / 86_400_000,
      ),
    );

    // Engagement rate
    if (metrics.engagementRate < 1) {
      recs.push(
        `Your engagement rate of ${metrics.engagementRate.toFixed(2)}% is below the industry benchmark of 1–3%. ` +
          `Try publishing more interactive content — polls, carousels, or question stickers — to encourage audience interaction.`,
      );
    } else if (metrics.engagementRate >= 5) {
      recs.push(
        `Outstanding engagement rate of ${metrics.engagementRate.toFixed(2)}%! Your content resonates strongly with your audience. ` +
          `Consider increasing posting frequency to maximise this momentum.`,
      );
    } else {
      recs.push(
        `Your engagement rate of ${metrics.engagementRate.toFixed(2)}% is within healthy range. ` +
          `Focus on consistency and experiment with new formats (Reels, carousels) to push it higher.`,
      );
    }

    // Posting frequency
    const postsPerWeek = (metrics.totalPosts / daysDiff) * 7;
    if (postsPerWeek < 3) {
      recs.push(
        `You averaged ${postsPerWeek.toFixed(1)} posts/week during this period. ` +
          `Publishing 4–7 times per week is recommended to maintain algorithmic visibility and grow your audience consistently.`,
      );
    }

    // Best media type
    if (topPosts.length >= 3) {
      const typeMap: Record<string, { total: number; count: number }> = {};
      topPosts.forEach((p) => {
        const t = p.mediaType;
        if (!typeMap[t]) typeMap[t] = { total: 0, count: 0 };
        typeMap[t].total += p.engagementRate;
        typeMap[t].count += 1;
      });
      const bestType = Object.entries(typeMap)
        .map(([type, { total, count }]) => ({ type, avg: total / count }))
        .sort((a, b) => b.avg - a.avg)[0];

      if (bestType) {
        recs.push(
          `${bestType.type} content drives the highest average engagement (${bestType.avg.toFixed(1)}%) among your posts. ` +
            `Prioritise this format in your content calendar to sustain high-performing output.`,
        );
      }
    }

    // Reach vs impressions (content recall)
    if (metrics.impressions > 0 && metrics.reach > 0) {
      const avgViews = metrics.impressions / metrics.reach;
      if (avgViews >= 1.5) {
        recs.push(
          `On average, each unique account sees your content ${avgViews.toFixed(1)} times — a strong content recall signal. ` +
            `Leverage this with serialised posts or carousel stories to build a recurring audience.`,
        );
      }
    }

    // Profile views
    if (metrics.profileViews > 50) {
      recs.push(
        `Your profile received ${this.formatNumber(metrics.profileViews)} visits this period. ` +
          `Make sure your bio, link-in-bio, and pinned highlights are optimised to convert visitors into followers or clients.`,
      );
    }

    if (recs.length < 3) {
      recs.push(
        `Engage with comments within the first 60 minutes of posting — early interaction signals quality to the algorithm and can significantly boost organic reach.`,
      );
    }

    return recs.slice(0, 5);
  }

  private formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }
}
