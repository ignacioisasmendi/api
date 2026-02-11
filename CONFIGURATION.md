# Configuration Guide

This application uses a centralized configuration system powered by `@nestjs/config`. All configuration is loaded from environment variables and validated on startup.

## 📁 Configuration Structure

```
src/config/
├── config.module.ts                    # Main configuration module
├── app.config.ts                       # Application settings
├── database.config.ts                  # Database configuration
├── instagram.config.ts                 # Instagram platform config
├── facebook.config.ts                  # Facebook platform config
├── tiktok.config.ts                    # TikTok platform config
├── x.config.ts                         # X (Twitter) platform config
├── cron.config.ts                      # Cron job settings
└── validation/
    └── config-validation.service.ts    # Startup validation
```

## 🔧 Environment Variables

### Application Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `development` | Environment mode (development, production, test) |
| `PORT` | number | `3000` | Server port |
| `LOG_LEVEL` | string | `log` | Logging level |
| `LOG_LEVELS` | string | `log,error,warn,debug,verbose` | Enabled log levels |
| `CORS_ENABLED` | boolean | `true` | Enable CORS |
| `CORS_ORIGINS` | string | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `API_PREFIX` | string | `` | API prefix (e.g., `/api/v1`) |

### Database Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `DATABASE_URL` | string | ✅ Yes | PostgreSQL connection string |
| `DB_POOL_MIN` | number | No | Min connection pool size (default: 2) |
| `DB_POOL_MAX` | number | No | Max connection pool size (default: 10) |
| `DB_QUERY_TIMEOUT` | number | No | Query timeout in ms (default: 30000) |
| `DB_LOG_QUERIES` | boolean | No | Log all queries (default: false) |

### Instagram Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `INSTAGRAM_ACCOUNT_ID` | string | ✅ Yes | Instagram Business Account ID |
| `INSTAGRAM_ACCESS_TOKEN` | string | ✅ Yes | Instagram Graph API Access Token |
| `INSTAGRAM_API_URL` | string | No | API base URL (default: https://graph.instagram.com/v24.0) |
| `INSTAGRAM_API_VERSION` | string | No | API version (default: v24.0) |
| `INSTAGRAM_MAX_REQUESTS_PER_HOUR` | number | No | Rate limit (default: 200) |
| `INSTAGRAM_REQUEST_TIMEOUT` | number | No | Request timeout in ms (default: 30000) |
| `INSTAGRAM_MEDIA_WAIT_TIME` | number | No | Wait time for images in ms (default: 1000) |
| `INSTAGRAM_VIDEO_WAIT_TIME` | number | No | Wait time for videos in ms (default: 5000) |

### Facebook Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `FACEBOOK_PAGE_ID` | string | ✅ Yes* | Facebook Page ID |
| `FACEBOOK_ACCESS_TOKEN` | string | ✅ Yes* | Facebook Page Access Token |
| `FACEBOOK_APP_ID` | string | No | Facebook App ID |
| `FACEBOOK_APP_SECRET` | string | No | Facebook App Secret |
| `FACEBOOK_API_URL` | string | No | API base URL (default: https://graph.facebook.com/v19.0) |
| `FACEBOOK_API_VERSION` | string | No | API version (default: v19.0) |
| `FACEBOOK_MAX_REQUESTS_PER_HOUR` | number | No | Rate limit (default: 200) |
| `FACEBOOK_REQUEST_TIMEOUT` | number | No | Request timeout in ms (default: 30000) |

*Required only if you want to publish to Facebook

### TikTok Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `TIKTOK_CLIENT_KEY` | string | ✅ Yes* | TikTok Client Key |
| `TIKTOK_CLIENT_SECRET` | string | ✅ Yes* | TikTok Client Secret |
| `TIKTOK_ACCESS_TOKEN` | string | No | TikTok Access Token |
| `TIKTOK_REFRESH_TOKEN` | string | No | TikTok Refresh Token |
| `TIKTOK_API_URL` | string | No | API base URL (default: https://open.tiktokapis.com/v2) |
| `TIKTOK_API_VERSION` | string | No | API version (default: v2) |
| `TIKTOK_MAX_REQUESTS_PER_DAY` | number | No | Rate limit (default: 1000) |
| `TIKTOK_REQUEST_TIMEOUT` | number | No | Request timeout in ms (default: 60000) |

*Required only if you want to publish to TikTok

### X (Twitter) Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `X_API_KEY` | string | ✅ Yes* | X API Key (Consumer Key) |
| `X_API_SECRET` | string | ✅ Yes* | X API Secret (Consumer Secret) |
| `X_ACCESS_TOKEN` | string | No | X Access Token |
| `X_ACCESS_SECRET` | string | No | X Access Token Secret |
| `X_BEARER_TOKEN` | string | No | X Bearer Token (OAuth 2.0) |
| `X_API_URL` | string | No | API base URL (default: https://api.twitter.com/2) |
| `X_API_VERSION` | string | No | API version (default: 2) |
| `X_MAX_TWEETS_PER_DAY` | number | No | Rate limit (default: 300) |
| `X_REQUEST_TIMEOUT` | number | No | Request timeout in ms (default: 30000) |

*Required only if you want to publish to X

### Cron Job Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CRON_PUBLISHER_SCHEDULE` | string | `*/30 * * * * *` | Cron expression for publisher job |
| `CRON_MAX_RETRIES` | number | `3` | Max retry attempts for failed publications |
| `CRON_RETRY_DELAY_MS` | number | `5000` | Delay between retries in ms |
| `CRON_BATCH_SIZE` | number | `10` | Max publications to process per run |
| `CRON_CONCURRENT_PUBLICATIONS` | number | `3` | Max concurrent publications |
| `CRON_ENABLE_METRICS` | boolean | `false` | Enable metrics collection |
| `CRON_LOG_EVERY_RUN` | boolean | `true` | Log on every cron execution |

## 📝 Example .env File

```env
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=log

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/poster_db"

# Instagram (Required for Instagram publishing)
INSTAGRAM_ACCOUNT_ID=123456789
INSTAGRAM_ACCESS_TOKEN=your_long_access_token_here

# Facebook (Optional - only if using Facebook)
# FACEBOOK_PAGE_ID=987654321
# FACEBOOK_ACCESS_TOKEN=your_facebook_token_here

# Cron Job
CRON_PUBLISHER_SCHEDULE=*/30 * * * * *
CRON_BATCH_SIZE=10
```

## 🚀 Using Configuration in Code

### Injecting ConfigService

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Get a config value
    const apiUrl = this.configService.get<string>('instagram.apiUrl');
    
    // Get with default fallback
    const timeout = this.configService.get<number>('instagram.requestTimeout', 30000);
    
    // Get nested config
    const logLevel = this.configService.get<string>('app.logLevel');
  }
}
```

### Type-Safe Configuration Access

Each configuration namespace is registered with `registerAs()`, allowing type-safe access:

```typescript
// In your service
const instagramConfig = this.configService.get('instagram');
// instagramConfig has all Instagram config properties

const apiUrl = instagramConfig.apiUrl;
const accountId = instagramConfig.accountId;
```

## ✅ Configuration Validation

The `ConfigValidationService` automatically validates configuration on application startup:

### What it checks:
1. ✅ **Required fields** - DATABASE_URL must be present
2. ⚠️ **Platform credentials** - Warns if platform credentials are missing
3. ⚠️ **Environment** - Warns if NODE_ENV is not standard value
4. 📊 **Logs summary** - Shows enabled platforms and settings

### Startup Output Example:

```
[ConfigValidationService] ✅ Configuration validated successfully
[ConfigValidationService] Configuration Summary:
[ConfigValidationService]   Environment: development
[ConfigValidationService]   Port: 3000
[ConfigValidationService]   Log Level: log
[ConfigValidationService]   Cron Schedule: */30 * * * * *
[ConfigValidationService]   Enabled Platforms: Instagram
[ConfigValidationService] ⚠️  Configuration warnings:
[ConfigValidationService]   ⚠️  Facebook credentials not configured. Facebook publishing will not work.
[ConfigValidationService]   ⚠️  TikTok credentials not configured. TikTok publishing will not work.
[ConfigValidationService]   ⚠️  X (Twitter) credentials not configured. X publishing will not work.
```

## 🔒 Security Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use environment-specific files**:
   - `.env.development`
   - `.env.production`
   - `.env.test`
3. **Rotate tokens regularly** - Especially access tokens
4. **Use secrets management** - For production (AWS Secrets Manager, Vault, etc.)
5. **Validate on startup** - Already built-in!

## 🔄 Cron Schedule Examples

```env
# Every 30 seconds (default)
CRON_PUBLISHER_SCHEDULE=*/30 * * * * *

# Every minute
CRON_PUBLISHER_SCHEDULE=0 * * * * *

# Every 5 minutes
CRON_PUBLISHER_SCHEDULE=0 */5 * * * *

# Every hour at :00
CRON_PUBLISHER_SCHEDULE=0 0 * * * *

# Every day at midnight
CRON_PUBLISHER_SCHEDULE=0 0 0 * * *

# Every day at 9 AM
CRON_PUBLISHER_SCHEDULE=0 0 9 * * *
```

Format: `seconds minutes hours day-of-month month day-of-week`

## 🧪 Testing with Different Configurations

```typescript
// In tests, you can override config
import { ConfigModule } from '@nestjs/config';

const module = await Test.createTestingModule({
  imports: [
    ConfigModule.forRoot({
      load: [
        () => ({
          instagram: {
            apiUrl: 'http://mock-api.test',
            accountId: 'test-account',
            accessToken: 'test-token',
          }
        })
      ]
    })
  ],
}).compile();
```

## 📖 Adding New Configuration

To add a new configuration namespace:

1. **Create config file** (e.g., `linkedin.config.ts`):
```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('linkedin', () => ({
  apiUrl: process.env.LINKEDIN_API_URL || 'https://api.linkedin.com/v2',
  accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
}));
```

2. **Add to config.module.ts**:
```typescript
import linkedinConfig from './linkedin.config';

load: [
  // ... other configs
  linkedinConfig,
],
```

3. **Use in your service**:
```typescript
const apiUrl = this.configService.get<string>('linkedin.apiUrl');
```

## 🎯 Benefits of This Approach

✅ **Type Safety** - Full TypeScript support
✅ **Validation** - Catches missing config on startup
✅ **Centralized** - All config in one place
✅ **Environment-aware** - Easy to switch between environments
✅ **Testable** - Easy to mock in tests
✅ **Documented** - Self-documenting with defaults
✅ **Secure** - No hardcoded credentials
✅ **Maintainable** - Changes in one place

## 🔍 Checking Platform Configuration

To check if a platform is properly configured at runtime:

```typescript
import { ConfigValidationService } from './config/validation/config-validation.service';

constructor(
  private configValidation: ConfigValidationService
) {}

if (this.configValidation.isPlatformConfigured('instagram')) {
  // Instagram is ready to use
} else {
  // Instagram not configured
}
```
