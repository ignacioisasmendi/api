export interface DailyMetric {
  date: string;
  value: number;
}

export interface TopPost {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  timestamp: string;
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  saves: number;
  shares: number;
  engagementRate: number;
}

export interface ReportMetrics {
  impressions: number;
  reach: number;
  profileViews: number;
  followerCount: number;
  followerStart: number;
  followerGrowthPct: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  engagementRate: number;
}

export interface ReportCharts {
  impressions?: Buffer;
  reach?: Buffer;
}

export interface ReportData {
  account: {
    username: string;
    platform: string;
  };
  dateFrom: Date;
  dateTo: Date;
  metrics: ReportMetrics;
  dailyImpressions: DailyMetric[];
  dailyReach: DailyMetric[];
  topPosts: TopPost[];
  bestPost: TopPost | null;
  recommendations: string[];
}
