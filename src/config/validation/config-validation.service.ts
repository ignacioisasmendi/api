import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.validateConfig();
  }

  private validateConfig() {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required database config
    if (!this.configService.get('database.url')) {
      errors.push('DATABASE_URL is required');
    }

    // Validate Instagram config (if Instagram is enabled)
    const instagramAccountId = this.configService.get('instagram.accountId');
    const instagramAccessToken = this.configService.get(
      'instagram.accessToken',
    );

    if (!instagramAccountId || !instagramAccessToken) {
      warnings.push(
        'Instagram credentials not configured. Instagram publishing will not work.',
      );
    }

    // Validate Facebook config (if Facebook is enabled)
    const facebookPageId = this.configService.get('facebook.pageId');
    const facebookAccessToken = this.configService.get('facebook.accessToken');

    if (!facebookPageId || !facebookAccessToken) {
      warnings.push(
        'Facebook credentials not configured. Facebook publishing will not work.',
      );
    }

    // Validate TikTok config (if TikTok is enabled)
    const tiktokClientKey = this.configService.get('tiktok.clientKey');
    const tiktokClientSecret = this.configService.get('tiktok.clientSecret');

    if (!tiktokClientKey || !tiktokClientSecret) {
      warnings.push(
        'TikTok credentials not configured. TikTok publishing will not work.',
      );
    }

    // Validate X config (if X is enabled)
    const xApiKey = this.configService.get('x.apiKey');
    const xApiSecret = this.configService.get('x.apiSecret');

    if (!xApiKey || !xApiSecret) {
      warnings.push(
        'X (Twitter) credentials not configured. X publishing will not work.',
      );
    }

    // Validate app config
    const nodeEnv = this.configService.get('app.nodeEnv');
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
      warnings.push(
        `NODE_ENV is set to "${nodeEnv}". Expected: development, production, or test.`,
      );
    }

    // Log results
    if (errors.length > 0) {
      this.logger.error('Configuration validation failed:');
      errors.forEach((error) => this.logger.error(`  ❌ ${error}`));
      throw new Error(
        'Configuration validation failed. Please check your environment variables.',
      );
    }

    if (warnings.length > 0) {
      this.logger.warn('Configuration warnings:');
      warnings.forEach((warning) => this.logger.warn(`  ⚠️  ${warning}`));
    }

    this.logger.log('✅ Configuration validated successfully');
    this.logConfigSummary();
  }

  private logConfigSummary() {
    const env = this.configService.get('app.nodeEnv');
    const port = this.configService.get('app.port');
    const logLevel = this.configService.get('app.logLevel');
    const cronSchedule = this.configService.get('cron.publisherSchedule');

    this.logger.log('Configuration Summary:');
    this.logger.log(`  Environment: ${env}`);
    this.logger.log(`  Port: ${port}`);
    this.logger.log(`  Log Level: ${logLevel}`);
    this.logger.log(`  Cron Schedule: ${cronSchedule}`);

    // Log enabled platforms
    const platforms: string[] = [];
    if (this.configService.get('instagram.accountId'))
      platforms.push('Instagram');
    if (this.configService.get('facebook.pageId')) platforms.push('Facebook');
    if (this.configService.get('tiktok.clientKey')) platforms.push('TikTok');
    if (this.configService.get('x.apiKey')) platforms.push('X');

    this.logger.log(
      `  Enabled Platforms: ${platforms.length > 0 ? platforms.join(', ') : 'None'}`,
    );
  }

  /**
   * Check if a specific platform is configured
   */
  isPlatformConfigured(
    platform: 'instagram' | 'facebook' | 'tiktok' | 'x',
  ): boolean {
    switch (platform) {
      case 'instagram':
        return !!(
          this.configService.get('instagram.accountId') &&
          this.configService.get('instagram.accessToken')
        );
      case 'facebook':
        return !!(
          this.configService.get('facebook.pageId') &&
          this.configService.get('facebook.accessToken')
        );
      case 'tiktok':
        return !!(
          this.configService.get('tiktok.clientKey') &&
          this.configService.get('tiktok.clientSecret')
        );
      case 'x':
        return !!(
          this.configService.get('x.apiKey') &&
          this.configService.get('x.apiSecret')
        );
      default:
        return false;
    }
  }
}
