import { registerAs } from '@nestjs/config';

export default registerAs('instagram', () => ({
  // API Configuration
  apiUrl: process.env.INSTAGRAM_API_URL || 'https://graph.instagram.com/v24.0',
  apiVersion: process.env.INSTAGRAM_API_VERSION || 'v24.0',

  // Authentication
  accountId: process.env.INSTAGRAM_ACCOUNT_ID,
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,

  appId: process.env.INSTAGRAM_APP_ID,
  appSecret: process.env.INSTAGRAM_APP_SECRET,
  callbackUrl: process.env.INSTAGRAM_CALLBACK_URL,

  // Rate Limiting
  maxRequestsPerHour: parseInt(
    process.env.INSTAGRAM_MAX_REQUESTS_PER_HOUR || '200',
    10,
  ),
  requestTimeout: parseInt(
    process.env.INSTAGRAM_REQUEST_TIMEOUT || '30000',
    10,
  ),

  // Media Processing
  mediaProcessingWaitTime: parseInt(
    process.env.INSTAGRAM_MEDIA_WAIT_TIME || '1000',
    10,
  ),
  videoProcessingWaitTime: parseInt(
    process.env.INSTAGRAM_VIDEO_WAIT_TIME || '5000',
    10,
  ),

  // Content Constraints
  maxCaptionLength: 2200,
  maxHashtags: 30,
  supportedFormats: ['FEED', 'STORY', 'REEL'],
}));
