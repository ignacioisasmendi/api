import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PublicationService } from '../publications/publication.service';
import { PublisherFactory } from '../publishers/publisher.factory';
import { PublicationStatus } from '@prisma/client';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private readonly cronSchedule: string;
  private readonly logEveryRun: boolean;
  private readonly batchSize: number;

  constructor(
    private readonly publicationService: PublicationService,
    private readonly publisherFactory: PublisherFactory,
    private readonly configService: ConfigService,
  ) {
    this.cronSchedule = this.configService.get<string>('cron.publisherSchedule')!;
    this.logEveryRun = this.configService.get<boolean>('cron.logEveryRun')!;
    this.batchSize = this.configService.get<number>('cron.batchSize')!;
  }

  @Cron('*/2 * * * * *') // Note: Dynamic cron expression requires additional setup
  async handleCron() {
  /*   if (this.logEveryRun) {
      this.logger.log('Running scheduled publications check...');
    } */
    
    try {
      // Find publications due for publishing (limited by batch size)
      const publicationsToPublish = await this.publicationService.getScheduledPublications(5);
      
      // Limit to batch size to prevent overload
      const batch = publicationsToPublish.slice(0, this.batchSize);

      if (batch.length === 0) {
        /* if (this.logEveryRun) {
          this.logger.log('No publications to publish at this time');
        } */
        return;
      }

      this.logger.log(`Found ${batch.length} publication(s) to publish (batch size: ${this.batchSize})`);

      // Process each publication
      for (const publication of batch) {
        try {
          // Update status to PUBLISHING
          await this.publicationService.updatePublicationStatus(
            publication.id,
            PublicationStatus.PUBLISHING,
          );

          this.logger.log(
            `Publishing ${publication.socialAccount.platform} ${publication.format} (${publication.id})...`,
          );

          // Get the appropriate publisher for the platform
          const publisher = this.publisherFactory.getPublisher(publication.socialAccount.platform);

          // Publish using the platform-specific publisher
          const result = await publisher.publish(publication);

          if (result.success) {
            // Update status to PUBLISHED, along with platformId and link
            await this.publicationService.updatePublicationStatus(
              publication.id,
              PublicationStatus.PUBLISHED,
              undefined, // no error
              result.platformId,
              result.link,
            );

            const linkInfo = result.link ? ` - ${result.link}` : '';
            this.logger.log(
              `Successfully published ${publication.socialAccount.platform} ${publication.format} (${publication.id}): ${result.message}${linkInfo}`,
            );
          } else {
            // Update status to ERROR if publish failed
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
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            { err: error, publicationId: publication.id, platform: publication.socialAccount.platform },
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
              `Failed to update publication status to ERROR after publish failure`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Cron job failed to fetch/process publications batch');
    }
  }
}
