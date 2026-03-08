import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { TkOauthService } from '../oauth/tiktok/tk-oauth/tk-oauth.service';
import { EncryptionService } from '../shared/encryption/encryption.service';

const REFRESH_TOKEN_EXPIRED_ERRORS = new Set([
  'refresh_token_expired',
  'invalid_refresh_token',
]);

@Injectable()
export class TkTokenRefreshCronService {
  private readonly logger = new Logger(TkTokenRefreshCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tkOauthService: TkOauthService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Refresh TikTok access tokens that are about to expire (within 2 hours).
   * Runs every hour. TikTok tokens expire in 24 h; refresh tokens last 1 year.
   * If the refresh token itself has expired, the account is deactivated so the
   * user knows they need to re-authenticate.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    let accounts: { id: string; refreshToken: string | null }[];

    try {
      accounts = await this.prisma.socialAccount.findMany({
        where: {
          platform: 'TIKTOK',
          isActive: true,
          refreshToken: { not: null },
          expiresAt: {
            lte: twoHoursFromNow,
            gte: now,
          },
          OR: [
            { refreshExpiresAt: null },
            { refreshExpiresAt: { gt: now } },
          ],
        },
        select: { id: true, refreshToken: true },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'TikTok token refresh cron failed to query accounts',
      );
      return;
    }

    if (accounts.length === 0) return;

    this.logger.log(
      `Found ${accounts.length} TikTok account(s) needing token refresh`,
    );

    for (const account of accounts) {
      const plainRefreshToken = this.encryptionService.decrypt(
        account.refreshToken,
      )!;
      await this.refreshSingleAccount(account.id, plainRefreshToken);
    }
  }

  private async refreshSingleAccount(
    accountId: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      const tokenData =
        await this.tkOauthService.refreshAccessToken(refreshToken);

      const now = new Date();
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: this.encryptionService.encrypt(tokenData.access_token),
          refreshToken: this.encryptionService.encrypt(tokenData.refresh_token),
          expiresAt: new Date(now.getTime() + tokenData.expires_in * 1000),
          refreshExpiresAt: new Date(
            now.getTime() + tokenData.refresh_expires_in * 1000,
          ),
        },
      });

      this.logger.log(
        `Successfully refreshed TikTok token for account ${accountId}`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const tikTokError = error.response?.data?.error as string | undefined;
        const isExpiredRefreshToken =
          tikTokError !== undefined &&
          REFRESH_TOKEN_EXPIRED_ERRORS.has(tikTokError);

        this.logger.error(
          {
            accountId,
            status: error.response?.status,
            tikTokError,
            tikTokErrorDescription: error.response?.data?.error_description,
          },
          `TikTok token refresh failed for account ${accountId}`,
        );

        if (isExpiredRefreshToken) {
          await this.deactivateAccount(accountId);
        }
      } else {
        this.logger.error(
          { err: error, accountId },
          `Unexpected error refreshing TikTok token for account ${accountId}`,
        );
      }
    }
  }

  private async deactivateAccount(accountId: string): Promise<void> {
    try {
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          isActive: false,
          disconnectedAt: new Date(),
        },
      });
      this.logger.warn(
        `Deactivated TikTok account ${accountId} due to expired refresh token`,
      );
    } catch (dbError) {
      this.logger.error(
        { err: dbError, accountId },
        `Failed to deactivate TikTok account ${accountId} after expired refresh token`,
      );
    }
  }
}
