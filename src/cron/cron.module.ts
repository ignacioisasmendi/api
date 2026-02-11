import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { PublicationModule } from '../publications/publication.module';
import { PublishersModule } from '../publishers/publishers.module';

@Module({
  imports: [PublicationModule, PublishersModule],
  controllers: [CronController],
  providers: [CronService],
})
export class CronModule {}
