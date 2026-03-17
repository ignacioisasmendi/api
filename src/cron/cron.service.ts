import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PublicationService } from '../publications/publication.service';
import { PublisherFactory } from '../publishers/publisher.factory';
import { PublicationStatus } from '@prisma/client';
import { IgRateLimitError } from '../publishers/errors/ig-rate-limit.error';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private readonly batchSize: number;
  private readonly prepareBeforeMs: number;

  constructor(
    private readonly publicationService: PublicationService,
    private readonly publisherFactory: PublisherFactory,
    private readonly configService: ConfigService,
  ) {
    this.batchSize = this.configService.get<number>('cron.batchSize')!;
    this.prepareBeforeMs =
      this.configService.get<number>('cron.prepareBeforeMinutes')! * 60_000;
  }

  // ─── Phase 1: Prepare containers ahead of time ────────────────────────

  @Cron('*/10 * * * * *')
  async handlePrepare() {
    try {
      const publications =
        await this.publicationService.getPublicationsToPrepare(
          this.prepareBeforeMs,
          this.batchSize,
        );

      if (publications.length === 0) return;

      this.logger.log(
        `Found ${publications.length} publication(s) to prepare`,
      );

      for (const publication of publications) {
        try {
          const publisher = this.publisherFactory.getPublisher(
            publication.socialAccount.platform,
          );

          // Skip platforms that don't support preparation
          if (!publisher.prepare) {
            continue;
          }

          // Mark as PREPARING to prevent other cron runs from picking it up
          await this.publicationService.updatePublicationStatus(
            publication.id,
            PublicationStatus.PREPARING,
          );

          this.logger.log(
            `Preparing ${publication.socialAccount.platform} ${publication.format} (${publication.id})...`,
          );

          const result = await publisher.prepare(publication);

          if (result.success && result.containerId) {
            await this.publicationService.updatePublicationStatus(
              publication.id,
              PublicationStatus.READY,
              undefined, // no error
              undefined, // no platformId yet
              undefined, // no link yet
              result.containerId,
            );

            this.logger.log(
              `Container ready for ${publication.id}: ${result.containerId}`,
            );
          } else {
            // Preparation failed — revert to SCHEDULED so it falls through
            // to the full publish flow at publishAt time
            await this.publicationService.updatePublicationStatus(
              publication.id,
              PublicationStatus.SCHEDULED,
              result.error || 'Preparation failed, will retry at publish time',
            );

            this.logger.warn(
              `Prepare failed for ${publication.id}: ${result.error}. Will fall back to full publish.`,
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          if (error instanceof IgRateLimitError) {
            this.logger.warn(
              { publicationId: publication.id, platformUserId: error.platformUserId },
              `Instagram rate limited during prepare — reverting to SCHEDULED`,
            );
            try {
              await this.publicationService.updatePublicationStatus(
                publication.id,
                PublicationStatus.SCHEDULED,
                `Instagram rate limited, will retry automatically`,
              );
            } catch (dbError) {
              this.logger.error(
                { err: dbError, publicationId: publication.id },
                'Failed to revert publication status after rate limit',
              );
            }
            continue;
          }

          this.logger.error(
            { err: error, publicationId: publication.id },
            `Failed to prepare publication ${publication.id}: ${errorMessage}`,
          );

          // Revert to SCHEDULED so the publish cron can still try the full flow
          try {
            await this.publicationService.updatePublicationStatus(
              publication.id,
              PublicationStatus.SCHEDULED,
              `Prepare error: ${errorMessage}`,
            );
          } catch (dbError) {
            this.logger.error(
              { err: dbError, publicationId: publication.id },
              'Failed to revert publication status after prepare failure',
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        { err: error },
        'Prepare cron job failed to fetch/process publications batch',
      );
    }
  }

  // ─── Phase 2: Publish at the scheduled time ───────────────────────────

  @Cron('*/2 * * * * *')
  async handlePublish() {
    try {
      const publications =
        await this.publicationService.getPublicationsToPublish(this.batchSize);

      if (publications.length === 0) return;

      this.logger.log(
        `Found ${publications.length} publication(s) to publish`,
      );

      for (const publication of publications) {
        try {
          await this.publicationService.updatePublicationStatus(
            publication.id,
            PublicationStatus.PUBLISHING,
          );

          this.logger.log(
            `Publishing ${publication.socialAccount.platform} ${publication.format} (${publication.id})...`,
          );

          const publisher = this.publisherFactory.getPublisher(
            publication.socialAccount.platform,
          );

          const result = await publisher.publish(publication);

          if (result.success) {
            await this.publicationService.updatePublicationStatus(
              publication.id,
              PublicationStatus.PUBLISHED,
              undefined,
              result.platformId,
              result.link,
            );

            const linkInfo = result.link ? ` - ${result.link}` : '';
            this.logger.log(
              `Successfully published ${publication.socialAccount.platform} ${publication.format} (${publication.id}): ${result.message}${linkInfo}`,
            );
          } else {
            await this.publicationService.updatePublicationStatus(
              publication.id,
              PublicationStatus.ERROR,
              result.error || 'Publication failed',
            );

            this.logger.error(
              `Failed to publish ${publication.socialAccount.platform} ${publication.format} (${publication.id}): ${result.error}`,
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          if (error instanceof IgRateLimitError) {
            this.logger.warn(
              { publicationId: publication.id, platformUserId: error.platformUserId },
              `Instagram rate limited during publish — reverting to SCHEDULED`,
            );
            try {
              await this.publicationService.updatePublicationStatus(
                publication.id,
                PublicationStatus.SCHEDULED,
                `Instagram rate limited, will retry automatically`,
              );
            } catch (dbError) {
              this.logger.error(
                { err: dbError, publicationId: publication.id },
                'Failed to revert publication status after rate limit',
              );
            }
            continue;
          }

          this.logger.error(
            {
              err: error,
              publicationId: publication.id,
              platform: publication.socialAccount.platform,
            },
            `Failed to publish publication ${publication.id}: ${errorMessage}`,
          );

          try {
            await this.publicationService.updatePublicationStatus(
              publication.id,
              PublicationStatus.ERROR,
              errorMessage,
            );
          } catch (dbError) {
            this.logger.error(
              { err: dbError, publicationId: publication.id },
              'Failed to update publication status to ERROR after publish failure',
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        { err: error },
        'Publish cron job failed to fetch/process publications batch',
      );
    }
  }
}
