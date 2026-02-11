import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InstagramModule } from './instagram/instagram.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './cron/cron.module';
import { PublicationModule } from './publications/publication.module';
import { ContentModule } from './content/content.module';
import { ConfigurationModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { ClsModule } from 'nestjs-cls';
import { APP_GUARD } from '@nestjs/core';
import { Auth0Guard } from './auth/auth0.guard';
import { IgOauthModule } from './oauth/instagram/ig-oauth/ig-oauth.module';
import { TkOauthModule } from './oauth/tiktok/tk-oauth/tk-oauth.module';
import { StorageModule } from './shared/storage/storage.module';
import { TiktokModule } from './tiktok/tiktok.module';

@Module({
  imports: [
    // CLS Module - Para manejar el contexto de la request
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
      },
    }),
    ConfigurationModule,
    AuthModule,
    UserModule,
    InstagramModule,
    ContentModule,
    PublicationModule,
    ScheduleModule.forRoot(),
    CronModule,
    IgOauthModule,
    TkOauthModule,
    StorageModule,
    TiktokModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard global para proteger todas las rutas por defecto
    {
      provide: APP_GUARD,
      useClass: Auth0Guard,
    },
  ],
})
export class AppModule {}
