import { IsEnum } from 'class-validator';

export type InsightsPeriod = '7d' | '30d';

export class AccountInsightsQueryDto {
  @IsEnum(['7d', '30d'])
  period: InsightsPeriod;
}
