# Publication Flow Diagram

## 1. Creating a Publication (API Request Flow)

```
┌──────────────┐
│   Client     │
│   Request    │
└──────┬───────┘
       │
       │ POST /publications
       │ {platform: "INSTAGRAM", format: "FEED", ...}
       ▼
┌─────────────────────────────────────────┐
│  PublicationController                  │
│  (Receives and routes request)          │
└─────────────┬───────────────────────────┘
              │
              │ createPublication(dto)
              ▼
┌─────────────────────────────────────────┐
│  PublicationService                     │
│  (Business logic layer)                 │
├─────────────────────────────────────────┤
│  1. Get publisher from factory          │
│  2. Validate payload                    │
│  3. Create/Get Content record           │
│  4. Create Publication record           │
│  5. Return publication                  │
└─────────────┬───────────────────────────┘
              │
              │ getPublisher(platform)
              ▼
┌─────────────────────────────────────────┐
│  PublisherFactory                       │
│  (Strategy pattern - selects publisher) │
└─────────────┬───────────────────────────┘
              │
              │ Returns InstagramPublisher
              ▼
┌─────────────────────────────────────────┐
│  InstagramPublisher                     │
│  (Platform-specific validator)          │
├─────────────────────────────────────────┤
│  validatePayload(payload, format)       │
│  - Check required fields                │
│  - Validate format compatibility        │
│  - Check field constraints              │
└─────────────┬───────────────────────────┘
              │
              │ ValidationResult {isValid: true}
              ▼
┌─────────────────────────────────────────┐
│  PrismaService                          │
│  (Database operations)                  │
├─────────────────────────────────────────┤
│  1. INSERT INTO content (...)           │
│  2. INSERT INTO publication (...)       │
└─────────────┬───────────────────────────┘
              │
              │ Created publication
              ▼
┌─────────────────────────────────────────┐
│  Database (PostgreSQL)                  │
├─────────────────────────────────────────┤
│  Content:                               │
│  - id: "clx123..."                      │
│  - title: "My post"                     │
│                                         │
│  Publication:                           │
│  - id: "clx456..."                      │
│  - contentId: "clx123..."               │
│  - platform: "INSTAGRAM"                │
│  - format: "FEED"                       │
│  - status: "SCHEDULED"                  │
│  - publishAt: "2026-01-26T10:00:00Z"    │
│  - payload: {...}                       │
└─────────────────────────────────────────┘
```

## 2. Publishing via Cron Job (Automated Flow)

```
┌─────────────────────────────────────────┐
│  CronService                            │
│  @Cron('*/30 * * * * *')                │
│  Runs every 30 seconds                  │
└─────────────┬───────────────────────────┘
              │
              │ Every 30 seconds
              ▼
┌─────────────────────────────────────────┐
│  1. Query Database                      │
│  WHERE publishAt <= NOW()               │
│  AND status = 'SCHEDULED'               │
└─────────────┬───────────────────────────┘
              │
              │ Found 3 publications:
              │ - Instagram Feed
              │ - Facebook Post
              │ - TikTok Video
              ▼
┌─────────────────────────────────────────┐
│  For Each Publication:                  │
└─────────────┬───────────────────────────┘
              │
              ├─► Update status: PUBLISHING
              │
              │ getPublisher(publication.platform)
              ▼
┌─────────────────────────────────────────┐
│  PublisherFactory                       │
│  Returns correct publisher              │
└─────────────┬───────────────────────────┘
              │
              ├─► Instagram → InstagramPublisher
              ├─► Facebook → FacebookPublisher
              └─► TikTok → TikTokPublisher
              │
              ▼
┌─────────────────────────────────────────┐
│  InstagramPublisher.publish()           │
├─────────────────────────────────────────┤
│  1. Create media container              │
│     POST /media (image_url, caption)    │
│  2. Wait for processing                 │
│  3. Publish media                       │
│     POST /media_publish (creation_id)   │
└─────────────┬───────────────────────────┘
              │
              │ Instagram Graph API
              ▼
┌─────────────────────────────────────────┐
│  Instagram API                          │
│  https://graph.instagram.com/v24.0      │
└─────────────┬───────────────────────────┘
              │
              │ Success Response
              │ {id: "instagram_post_123"}
              ▼
┌─────────────────────────────────────────┐
│  Update Publication                     │
│  status: PUBLISHED                      │
│  (or ERROR if failed)                   │
└─────────────────────────────────────────┘
```

## 3. Bulk Publication Flow

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       │ POST /publications/bulk
       │ {
       │   title: "Campaign",
       │   publications: [
       │     {platform: "INSTAGRAM", ...},
       │     {platform: "FACEBOOK", ...},
       │     {platform: "TIKTOK", ...}
       │   ]
       │ }
       ▼
┌─────────────────────────────────────────┐
│  PublicationController                  │
│  bulkCreate()                           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  PublicationService                     │
│  bulkCreatePublications()               │
├─────────────────────────────────────────┤
│  1. Create single Content record        │
│     (shared across all platforms)       │
└─────────────┬───────────────────────────┘
              │
              │ contentId: "clx123..."
              ▼
┌─────────────────────────────────────────┐
│  For each publication in array:         │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │ Validate with InstagramPublisher │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ Validate with FacebookPublisher  │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ Validate with TikTokPublisher    │   │
│  └──────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
              │ All valid ✓
              ▼
┌─────────────────────────────────────────┐
│  Create all publications in parallel    │
│  Promise.all([...])                     │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Database Result:                       │
├─────────────────────────────────────────┤
│  Content (1 record):                    │
│    id: "clx123..."                      │
│    title: "Campaign"                    │
│                                         │
│  Publications (3 records):              │
│    1. Instagram Feed - SCHEDULED        │
│    2. Facebook Post - SCHEDULED         │
│    3. TikTok Video - SCHEDULED          │
└─────────────────────────────────────────┘
```

## 4. Adding a New Platform (Developer Flow)

```
┌─────────────────────────────────────────┐
│  Step 1: Create Publisher Class         │
├─────────────────────────────────────────┤
│  linkedin.publisher.ts                  │
│  implements IPlatformPublisher          │
│    - validatePayload()                  │
│    - publish()                          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Step 2: Update Factory                 │
├─────────────────────────────────────────┤
│  publisher.factory.ts                   │
│  case Platform.LINKEDIN:                │
│    return this.linkedinPublisher;       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Step 3: Update Schema                  │
├─────────────────────────────────────────┤
│  schema.prisma                          │
│  enum Platform {                        │
│    INSTAGRAM                            │
│    FACEBOOK                             │
│    TIKTOK                               │
│    X                                    │
│    LINKEDIN  ← Add                      │
│  }                                      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Step 4: Run Migration                  │
├─────────────────────────────────────────┤
│  npx prisma migrate dev                 │
│  --name add_linkedin_platform           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  ✅ DONE!                               │
│  All endpoints work automatically:      │
│  - POST /publications                   │
│  - POST /publications/bulk              │
│  - GET /linkedin/publications           │
│  - Cron job publishes to LinkedIn       │
└─────────────────────────────────────────┘
```

## 5. System Architecture Layers

```
┌──────────────────────────────────────────────────────┐
│                    API Layer                         │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │ Unified          │  │ Platform-Specific       │  │
│  │ Endpoints        │  │ Endpoints               │  │
│  │ /publications    │  │ /instagram/publications │  │
│  │ /publications/:id│  │ /facebook/publications  │  │
│  └──────────────────┘  └─────────────────────────┘  │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│              Business Logic Layer                    │
│  ┌────────────────────────────────────────────────┐  │
│  │  PublicationService                            │  │
│  │  - CRUD operations                             │  │
│  │  - Validation orchestration                    │  │
│  │  - Status management                           │  │
│  └────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│              Publisher Layer (Strategy)              │
│  ┌────────────────────────────────────────────────┐  │
│  │  PublisherFactory                              │  │
│  │  getPublisher(platform) → IPlatformPublisher   │  │
│  └───┬──────────┬──────────┬──────────┬───────────┘  │
│      │          │          │          │              │
│  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐            │
│  │ Inst │  │ Face │  │ TikT │  │  X   │            │
│  │ agram│  │ book │  │  ok  │  │      │            │
│  └──────┘  └──────┘  └──────┘  └──────┘            │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│                 Data Access Layer                    │
│  ┌────────────────────────────────────────────────┐  │
│  │  PrismaService                                 │  │
│  │  - Content table                               │  │
│  │  - Publication table                           │  │
│  └────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│               Database (PostgreSQL)                  │
│                                                      │
│  Content {id, title, createdAt}                      │
│  Publication {id, contentId, platform, format, ...}  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│            Background Job (Scheduler)                │
│  ┌────────────────────────────────────────────────┐  │
│  │  CronService                                   │  │
│  │  @Cron('*/30 * * * * *')                       │  │
│  │  1. Get scheduled publications                 │  │
│  │  2. Use factory to get publisher               │  │
│  │  3. Publish to platform                        │  │
│  │  4. Update status                              │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Key Design Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Open/Closed Principle**: Easy to add platforms without modifying existing code
3. **Dependency Injection**: All dependencies managed by NestJS
4. **Single Source of Truth**: Database schema defines the data model
5. **Strategy Pattern**: Different platforms, same interface
6. **Factory Pattern**: Centralized publisher creation
