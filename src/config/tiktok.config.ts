import { registerAs } from '@nestjs/config';

export default registerAs('tiktok', () => ({
  // API Configuration
  apiUrl: process.env.TIKTOK_API_URL || 'https://open.tiktokapis.com/v2',
  apiVersion: process.env.TIKTOK_API_VERSION || 'v2',

  // Authentication
  clientKey: process.env.TIKTOK_CLIENT_KEY,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  callbackUrl: process.env.TIKTOK_CALLBACK_URL,
  accessToken: process.env.TIKTOK_ACCESS_TOKEN,
  refreshToken: process.env.TIKTOK_REFRESH_TOKEN,

  // Rate Limiting
  maxRequestsPerDay: parseInt(
    process.env.TIKTOK_MAX_REQUESTS_PER_DAY || '1000',
    10,
  ),
  requestTimeout: parseInt(process.env.TIKTOK_REQUEST_TIMEOUT || '60000', 10),

  // Content Constraints
  maxDescriptionLength: 2200,
  maxVideoSizeMB: 287,
  minVideoSeconds: 3,
  maxVideoSeconds: 180,
  supportedFormats: ['VIDEO'],
}));
