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
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Auth0Guard } from './auth/auth0.guard';
import { IgOauthModule } from './oauth/instagram/ig-oauth/ig-oauth.module';
import { TkOauthModule } from './oauth/tiktok/tk-oauth/tk-oauth.module';
import { StorageModule } from './shared/storage/storage.module';
import { TiktokModule } from './tiktok/tiktok.module';
import { CalendarModule } from './calendars/calendar.module';
import { KanbanColumnModule } from './kanban-columns/kanban-column.module';
import { ShareLinkModule } from './share-links/share-link.module';
import { PublicShareModule } from './public-share/public-share.module';
import { ClientModule } from './clients/client.module';
import { MediaModule } from './media/media.module';
import { ClientInterceptor } from './interceptors/client.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PrismaService } from './prisma/prisma.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss.l',
                  ignore: 'pid,hostname,req,res',
                  singleLine: false,
                  messageFormat: '{if context}[{context}] {end}{msg}',
                  errorLikeObjectKeys: ['err', 'error'],
                },
              }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        autoLogging: false,
      },
    }),
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
    CalendarModule,
    KanbanColumnModule,
    ShareLinkModule,
    PublicShareModule,
    ClientModule,
    MediaModule,
    // Rate limiting: default is generous for authenticated endpoints
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute window
        limit: 60, // 60 requests per minute (default)
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour window
        limit: 1000, // 1000 requests per hour
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // Guard global para proteger todas las rutas por defecto
    {
      provide: APP_GUARD,
      useClass: Auth0Guard,
    },
    // Global rate limiting (configured above in ThrottlerModule)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Logging interceptor runs first (outermost) to capture all requests
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Interceptor global para resolver el client desde X-Client-Id header
    {
      provide: APP_INTERCEPTOR,
      useClass: ClientInterceptor,
    },
  ],
})
export class AppModule {}
