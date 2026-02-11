import { registerAs } from '@nestjs/config';

export default registerAs('facebook', () => ({
  // API Configuration
  apiUrl: process.env.FACEBOOK_API_URL || 'https://graph.facebook.com/v19.0',
  apiVersion: process.env.FACEBOOK_API_VERSION || 'v19.0',
  
  // Authentication
  pageId: process.env.FACEBOOK_PAGE_ID,
  accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
  appId: process.env.FACEBOOK_APP_ID,
  appSecret: process.env.FACEBOOK_APP_SECRET,
  
  // Rate Limiting
  maxRequestsPerHour: parseInt(process.env.FACEBOOK_MAX_REQUESTS_PER_HOUR || '200', 10),
  requestTimeout: parseInt(process.env.FACEBOOK_REQUEST_TIMEOUT || '30000', 10),
  
  // Content Constraints
  maxPostLength: 63206,
  supportedFormats: ['FEED', 'STORY', 'VIDEO'],
}));
