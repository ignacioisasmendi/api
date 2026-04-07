import { Global, Module } from '@nestjs/common';
import { ANALYTICS_PORT } from './analytics.port';
import { MixpanelAdapter } from './mixpanel.adapter';

@Global()
@Module({
  providers: [
    {
      provide: ANALYTICS_PORT,
      useClass: MixpanelAdapter,
    },
  ],
  exports: [ANALYTICS_PORT],
})
export class AnalyticsModule {}
