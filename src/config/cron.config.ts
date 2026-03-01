import { registerAs } from '@nestjs/config';

export default registerAs('cron', () => ({
  // Cron Schedule Configuration
  publisherSchedule: process.env.CRON_PUBLISHER_SCHEDULE || '*/30 * * * * *', // Every 30 seconds

  // Two-Phase Publishing
  // How many minutes before publishAt to pre-create containers (default: 5 minutes)
  prepareBeforeMinutes: parseInt(
    process.env.CRON_PREPARE_BEFORE_MINUTES || '5',
    10,
  ),

  // Retry Configuration
  maxRetries: parseInt(process.env.CRON_MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.CRON_RETRY_DELAY_MS || '5000', 10),

  // Performance Settings
  batchSize: parseInt(process.env.CRON_BATCH_SIZE || '10', 10), // Max publications to process per run
  concurrentPublications: parseInt(
    process.env.CRON_CONCURRENT_PUBLICATIONS || '3',
    10,
  ),

  // Monitoring
  enableMetrics: process.env.CRON_ENABLE_METRICS === 'true',
  logEveryRun: process.env.CRON_LOG_EVERY_RUN !== 'false', // Default true
}));
