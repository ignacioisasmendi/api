import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShareLinkCronService {
  private readonly logger = new Logger(ShareLinkCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deactivate expired share links every 15 minutes.
   * This is supplementary to the real-time check in resolveToken().
   * It keeps the DB state clean by marking expired links as inactive.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async deactivateExpiredLinks() {
    try {
      const result = await this.prisma.calendarShareLink.updateMany({
        where: {
          isActive: true,
          expiresAt: {
            lte: new Date(),
            not: null,
          },
        },
        data: {
          isActive: false,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Deactivated ${result.count} expired share link(s)`);
      }
    } catch (error) {
      this.logger.error('Error deactivating expired share links:', error);
    }
  }
}
