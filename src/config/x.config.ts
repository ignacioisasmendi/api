import { registerAs } from '@nestjs/config';

export default registerAs('x', () => ({
  // API Configuration
  apiUrl: process.env.X_API_URL || 'https://api.twitter.com/2',
  apiVersion: process.env.X_API_VERSION || '2',
  
  // Authentication (OAuth 1.0a or OAuth 2.0)
  apiKey: process.env.X_API_KEY,
  apiSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
  bearerToken: process.env.X_BEARER_TOKEN,
  
  // Rate Limiting
  maxTweetsPerDay: parseInt(process.env.X_MAX_TWEETS_PER_DAY || '300', 10),
  requestTimeout: parseInt(process.env.X_REQUEST_TIMEOUT || '30000', 10),
  
  // Content Constraints
  maxTextLength: 280,
  maxTextLengthPremium: 25000,
  maxMediaItems: 4,
  supportedFormats: ['FEED'],
}));
