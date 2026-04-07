import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import databaseConfig from './database.config';
import instagramConfig from './instagram.config';
import facebookConfig from './facebook.config';
import tiktokConfig from './tiktok.config';
import xConfig from './x.config';
import cronConfig from './cron.config';
import authConfig from './auth.config';
import pexelsConfig from './pexels.config';
import encryptionConfig from './encryption.config';
import adminConfig from './admin.config';
import canvaConfig from './canva.config';
import mixpanelConfig from './mixpanel.config';
import { ConfigValidationService } from './validation/config-validation.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [
        appConfig,
        databaseConfig,
        instagramConfig,
        facebookConfig,
        tiktokConfig,
        xConfig,
        cronConfig,
        authConfig,
        pexelsConfig,
        encryptionConfig,
        adminConfig,
        canvaConfig,
        mixpanelConfig,
      ],
    }),
  ],
  providers: [ConfigValidationService],
  exports: [ConfigValidationService],
})
export class ConfigurationModule {}
