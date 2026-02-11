# Multi-Platform Publication System - Architecture Documentation

## Overview

This application implements a **Hybrid Architecture with Strategy Pattern** for scheduling and publishing content across multiple social media platforms (Instagram, Facebook, TikTok, X/Twitter).

## Architecture Design

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Controllers)                  │
├─────────────────────────────────────────────────────────────┤
│  Unified Endpoints        │    Platform-Specific Endpoints   │
│  POST /publications       │    GET /instagram/publications   │
│  POST /publications/bulk  │    GET /facebook/publications    │
│  GET /publications        │    GET /tiktok/publications      │
│  GET /publications/:id    │    GET /x/publications           │
│  PUT /publications/:id    │                                  │
│  DELETE /publications/:id │                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  PublicationService (CRUD + Scheduling Logic)                │
│  - Payload validation using publishers                       │
│  - Publication lifecycle management                          │
│  - Status updates (SCHEDULED → PUBLISHING → PUBLISHED)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Publisher Layer                           │
├─────────────────────────────────────────────────────────────┤
│            PublisherFactory (Strategy Pattern)               │
│                           │                                  │
│    ┌──────────┬───────────┼───────────┬──────────┐          │
│    ▼          ▼           ▼           ▼          ▼          │
│  Instagram  Facebook   TikTok        X      (Future...)     │
│  Publisher  Publisher  Publisher  Publisher                 │
│                                                              │
│  Each implements IPlatformPublisher interface:               │
│  - validatePayload(payload, format)                          │
│  - publish(publication)                                      │
│  - cancel?(publicationId)  [optional]                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  PrismaService + PostgreSQL                                  │
│  - Content table (platform-agnostic content)                 │
│  - Publication table (platform-specific publications)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cron Job (Scheduler)                       │
├─────────────────────────────────────────────────────────────┤
│  CronService - Runs every 30 seconds                         │
│  1. Fetches publications due for publishing                  │
│  2. Gets appropriate publisher from factory                  │
│  3. Publishes to platform                                    │
│  4. Updates status (PUBLISHED or ERROR)                      │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Unified Endpoints (Platform-Agnostic)

#### Create Single Publication
```http
POST /publications
Content-Type: application/json

{
  "title": "My awesome post",
  "platform": "INSTAGRAM",
  "format": "FEED",
  "publishAt": "2026-01-26T10:00:00Z",
  "payload": {
    "image_url": "https://example.com/image.jpg",
    "caption": "Check this out! #awesome"
  }
}
```

#### Create Bulk Publications (Multi-Platform)
```http
POST /publications/bulk
Content-Type: application/json

{
  "title": "My cross-platform campaign",
  "publications": [
    {
      "platform": "INSTAGRAM",
      "format": "FEED",
      "publishAt": "2026-01-26T10:00:00Z",
      "payload": {
        "image_url": "https://example.com/image.jpg",
        "caption": "Instagram post #insta"
      }
    },
    {
      "platform": "FACEBOOK",
      "format": "FEED",
      "publishAt": "2026-01-26T10:00:00Z",
      "payload": {
        "message": "Facebook post",
        "image_url": "https://example.com/image.jpg"
      }
    },
    {
      "platform": "X",
      "format": "FEED",
      "publishAt": "2026-01-26T10:00:00Z",
      "payload": {
        "text": "Twitter/X post with image",
        "media_urls": ["https://example.com/image.jpg"]
      }
    }
  ]
}
```

#### List Publications
```http
GET /publications?platform=INSTAGRAM&status=SCHEDULED
```

Query parameters:
- `platform`: Filter by platform (INSTAGRAM, FACEBOOK, TIKTOK, X)
- `status`: Filter by status (SCHEDULED, PUBLISHING, PUBLISHED, ERROR)
- `contentId`: Filter by content ID

#### Get Single Publication
```http
GET /publications/:id
```

#### Update Publication
```http
PUT /publications/:id
Content-Type: application/json

{
  "publishAt": "2026-01-26T12:00:00Z",
  "payload": {
    "caption": "Updated caption"
  }
}
```

#### Delete Publication
```http
DELETE /publications/:id
```

### Platform-Specific Endpoints

These endpoints are shortcuts for filtering by platform:

```http
GET /instagram/publications?status=SCHEDULED
GET /facebook/publications?status=PUBLISHED
GET /tiktok/publications
GET /x/publications
```

## Platform Payloads

### Instagram

#### Feed Post
```json
{
  "platform": "INSTAGRAM",
  "format": "FEED",
  "payload": {
    "image_url": "https://example.com/image.jpg",
    "caption": "Post caption (max 2200 chars)"
  }
}
```

#### Story
```json
{
  "platform": "INSTAGRAM",
  "format": "STORY",
  "payload": {
    "image_url": "https://example.com/story.jpg",
    "link": "https://example.com" // Optional
  }
}
```

#### Reel
```json
{
  "platform": "INSTAGRAM",
  "format": "REEL",
  "payload": {
    "video_url": "https://example.com/reel.mp4",
    "caption": "Reel caption",
    "cover_url": "https://example.com/cover.jpg" // Optional
  }
}
```

### Facebook

```json
{
  "platform": "FACEBOOK",
  "format": "FEED",
  "payload": {
    "message": "Post message",
    "image_url": "https://example.com/image.jpg", // Optional
    "link": "https://example.com" // Optional
  }
}
```

### TikTok

```json
{
  "platform": "TIKTOK",
  "format": "VIDEO",
  "payload": {
    "video_url": "https://example.com/video.mp4",
    "description": "Video description (max 2200 chars)",
    "privacy_level": "PUBLIC" // PUBLIC, FRIENDS, or PRIVATE
  }
}
```

### X (Twitter)

```json
{
  "platform": "X",
  "format": "FEED",
  "payload": {
    "text": "Tweet text (max 280 chars)",
    "media_urls": ["https://example.com/image1.jpg"] // Optional, max 4 items
  }
}
```

## Enums

### Platform
- `INSTAGRAM`
- `FACEBOOK`
- `TIKTOK`
- `X`

### ContentFormat
- `FEED` - Regular feed post
- `STORY` - Story/temporary content
- `REEL` - Short video (Instagram Reels)
- `VIDEO` - Long-form video

### PublicationStatus
- `SCHEDULED` - Waiting to be published
- `PUBLISHING` - Currently being published
- `PUBLISHED` - Successfully published
- `ERROR` - Failed to publish (see error field)

## Code Structure

```
src/
├── publishers/                    # Publisher layer (Strategy Pattern)
│   ├── interfaces/
│   │   └── platform-publisher.interface.ts
│   ├── types/
│   │   └── platform-payloads.types.ts
│   ├── instagram.publisher.ts     # Instagram implementation
│   ├── facebook.publisher.ts      # Facebook stub
│   ├── tiktok.publisher.ts        # TikTok stub
│   ├── x.publisher.ts             # X/Twitter stub
│   ├── publisher.factory.ts       # Factory for getting publishers
│   └── publishers.module.ts
│
├── publications/                  # Business logic layer
│   ├── dto/
│   │   └── publication.dto.ts
│   ├── publication.controller.ts  # All API endpoints
│   ├── publication.service.ts     # CRUD + scheduling logic
│   └── publication.module.ts
│
├── cron/                          # Scheduler
│   ├── cron.service.ts            # Cron job that publishes
│   ├── cron.controller.ts
│   └── cron.module.ts
│
├── prisma/
│   └── prisma.service.ts
│
└── app.module.ts                  # Main module
```

## Reusable vs Platform-Specific

### ✅ Reusable Components

1. **PublicationService** - All CRUD operations
2. **Date/time validation** - Handled in DTOs
3. **Status management** - Same lifecycle for all platforms
4. **Error handling** - Standardized error responses
5. **Cron infrastructure** - One cron job for all platforms
6. **Database operations** - Single schema for all platforms
7. **Validation framework** - Common validation interface

### ❌ Platform-Specific Components

1. **Publisher implementations** - Each platform has unique API
2. **Payload structure validation** - Different required fields
3. **Media upload handling** - Different upload processes
4. **Format compatibility** - Not all platforms support all formats
5. **API authentication** - Different auth methods per platform
6. **Rate limiting** - Different rules per platform

## How to Add a New Platform

1. **Create publisher class** (e.g., `linkedin.publisher.ts`):
```typescript
@Injectable()
export class LinkedInPublisher implements IPlatformPublisher {
  async validatePayload(payload: any, format: string): Promise<ValidationResult> {
    // Implement validation
  }

  async publish(publication: Publication): Promise<PublishResult> {
    // Implement LinkedIn API calls
  }
}
```

2. **Add to factory** (`publisher.factory.ts`):
```typescript
case Platform.LINKEDIN:
  return this.linkedinPublisher;
```

3. **Update Prisma enum** (`schema.prisma`):
```prisma
enum Platform {
  INSTAGRAM
  FACEBOOK
  TIKTOK
  X
  LINKEDIN  // Add new platform
}
```

4. **Run migration**:
```bash
npx prisma migrate dev --name add_linkedin_platform
```

5. **Add controller** (optional, for platform-specific endpoints):
```typescript
@Controller('linkedin/publications')
export class LinkedInPublicationController { ... }
```

That's it! The cron job and all generic endpoints work automatically.

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/poster_db"

# Instagram
INSTAGRAM_ACCOUNT_ID="your_instagram_account_id"
INSTAGRAM_ACCESS_TOKEN="your_instagram_access_token"

# Facebook (when implementing)
FACEBOOK_PAGE_ID="your_facebook_page_id"
FACEBOOK_ACCESS_TOKEN="your_facebook_access_token"

# TikTok (when implementing)
TIKTOK_CLIENT_KEY="your_tiktok_client_key"
TIKTOK_CLIENT_SECRET="your_tiktok_client_secret"

# X/Twitter (when implementing)
X_API_KEY="your_x_api_key"
X_API_SECRET="your_x_api_secret"
X_ACCESS_TOKEN="your_x_access_token"
X_ACCESS_SECRET="your_x_access_secret"
```

## Running the Application

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

The cron job will automatically start and check for scheduled publications every 30 seconds.

## Benefits of This Architecture

1. **Single Responsibility** - Each class has one job
2. **Open/Closed Principle** - Easy to add platforms without modifying existing code
3. **DRY (Don't Repeat Yourself)** - Shared logic in service layer
4. **Testability** - Easy to mock publishers and test in isolation
5. **Maintainability** - Clear separation of concerns
6. **Scalability** - Can easily add queues, retries, webhooks, etc.
7. **Type Safety** - Strong typing with TypeScript and Prisma
8. **Flexibility** - Supports both single and bulk scheduling

## Future Enhancements

- Add BullMQ for better queue management
- Implement webhook handlers for platform callbacks
- Add retry logic with exponential backoff
- Implement media preprocessing (resizing, format conversion)
- Add analytics and reporting
- Implement OAuth flows for user authentication
- Add media library management
- Support for video uploads
- Implement approval workflows
