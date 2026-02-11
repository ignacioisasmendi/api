# Database Schema Update - Implementation Summary

## Overview
This document summarizes all changes made to adapt the API to the new database schema that separates media management from publications.

## Schema Changes

### Key Changes
1. **Removed `payload` field** from `Publication` model
2. **Added `platform` field** to `Publication` model (derived from SocialAccount)
3. **Removed `title` field** from `Content` model
4. **Added `caption` field** to `Content` model
5. **Added `Media` model** for storing media files with metadata
6. **Added `PublicationMedia` junction table** linking publications to specific media files
7. **Added `customCaption`** and **`platformConfig`** fields to `Publication` for platform-specific overrides

### New Models

#### Media
```prisma
model Media {
  id          String    @id @default(cuid())
  contentId   String
  url         String    // Public R2 URL
  key         String    // R2 storage key
  type        MediaType // IMAGE, VIDEO, THUMBNAIL
  mimeType    String
  size        Int
  width       Int?
  height      Int?
  duration    Int?      // For videos
  thumbnail   String?   // Thumbnail URL for videos
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  
  content         Content            @relation(...)
  publicationUsage PublicationMedia[] @relation(...)
}
```

#### PublicationMedia
```prisma
model PublicationMedia {
  id            String   @id @default(cuid())
  publicationId String
  mediaId       String
  order         Int      @default(0)
  cropData      Json?    // Platform-specific crop data
  
  publication Publication @relation(...)
  media       Media       @relation(...)
}
```

## Backend Changes

### 1. New Modules Created

#### Content Module
- **Location:** `src/content/`
- **Purpose:** Manage content and media creation
- **Files:**
  - `content.module.ts` - Module definition
  - `content.controller.ts` - REST endpoints
  - `content.service.ts` - Business logic
  - `dto/content.dto.ts` - DTOs

**Endpoints:**
- `POST /content` - Create content with media
- `GET /content` - List all user's content
- `GET /content/:id` - Get specific content
- `PATCH /content/:id` - Update content
- `POST /content/:id/media` - Add media to content
- `DELETE /content/:id` - Delete content
- `DELETE /content/media/:mediaId` - Delete specific media

### 2. Storage Module Updates

#### Storage Controller (NEW)
- **Location:** `src/shared/storage/storage.controller.ts`
- **Purpose:** Generate presigned URLs for direct uploads

**Endpoint:**
- `POST /storage/upload-url` - Get presigned URL for R2 upload

#### Storage DTOs (NEW)
- **Location:** `src/shared/storage/dto/storage.dto.ts`
- **DTOs:**
  - `GenerateUploadUrlDto`
  - `UploadUrlResponseDto`

### 3. Publication Module Updates

#### Updated DTOs
**Location:** `src/publications/dto/publication.dto.ts`

**Changes:**
- `CreatePublicationDto`:
  - ✅ Added: `contentId` (required)
  - ✅ Added: `socialAccountId` (required)
  - ✅ Added: `customCaption` (optional)
  - ✅ Added: `platformConfig` (optional)
  - ✅ Added: `mediaIds: PublicationMediaDto[]` (required)
  - ❌ Removed: `title`
  - ❌ Removed: `payload`
  - ❌ Removed: `platform`

- `BulkCreatePublicationDto`:
  - ✅ Changed: Now requires `contentId` instead of `title`

- `UpdatePublicationDto`:
  - ✅ Added: `customCaption`
  - ✅ Added: `platformConfig`
  - ✅ Added: `mediaIds`
  - ❌ Removed: `payload`

#### Updated Service
**Location:** `src/publications/publication.service.ts`

**Key Changes:**
- All queries now include media relations:
  ```typescript
  include: {
    content: { include: { media: true } },
    socialAccount: true,
    mediaUsage: { 
      include: { media: true },
      orderBy: { order: 'asc' },
    },
  }
  ```

- `createPublication()`: Now validates media IDs and creates `PublicationMedia` relations
- `bulkCreatePublications()`: Same validation for bulk operations
- `updatePublication()`: Can update media relations
- `getScheduledPublications()`: Includes media for cron job

### 4. Publishers Module Updates

#### Instagram Publisher
**Location:** `src/publishers/instagram.publisher.ts`

**Major Refactoring:**
- ❌ Removed: Payload-based validation
- ✅ Changed: `publish()` method now fetches full publication with media relations
- ✅ Updated: All publish methods (`publishFeed`, `publishStory`, `publishReel`)
- ✅ Added: `publishCarousel()` method for multi-media posts
- ✅ Added: Helper methods for carousel creation
- Uses `customCaption` if provided, falls back to `content.caption`
- Accesses media via `publication.mediaUsage[].media`

**New Methods:**
```typescript
private async publishFeed(publication: any): Promise<PublishResult>
private async publishStory(publication: any): Promise<PublishResult>
private async publishReel(publication: any): Promise<PublishResult>
private async publishCarousel(publication: any): Promise<PublishResult>
private async createCarouselItemContainer(...)
private async createCarouselContainer(...)
```

### 5. Instagram Service (Legacy - Deprecated)

**Location:** `src/instagram/instagram.service.ts`

- Added deprecation warning in `schedulePost()`
- Method still exists for backward compatibility but logs warning
- Frontend should migrate to new flow: Content → Publications

### 6. App Module

**Location:** `src/app.module.ts`

- ✅ Added: `ContentModule` import

## New Upload Flow

### Backend Flow
```
1. Frontend → POST /storage/upload-url → Get presigned URL
2. Frontend → PUT to R2 directly → Upload file
3. Frontend → POST /content → Create content with media metadata
4. Frontend → POST /publications → Create publication(s)
5. Cron job → Fetches publications with media → Publishes
```

### Previous Flow (Deprecated)
```
1. Frontend → POST /instagram/schedule with mediaUrl
2. Backend creates publication with payload { image_url, caption }
3. Cron job uses payload to publish
```

## Database Migrations

The schema changes are already reflected in `prisma/schema.prisma`. To apply:

```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Or in production
npx prisma migrate deploy
```

## Frontend Updates Required

### Required Changes

1. **File Upload Flow**
   - Request presigned URL from `/storage/upload-url`
   - Upload files directly to R2
   - Save returned `key` and `publicUrl`

2. **Content Creation**
   - After uploading, create content via `POST /content`
   - Include media array with all uploaded files

3. **Publication Creation**
   - Use `POST /publications` with new DTO structure
   - Must include `contentId` and `mediaIds[]`
   - Can specify `customCaption` per platform

4. **Remove Direct Scheduling**
   - Stop using `POST /instagram/schedule`
   - Use new multi-step flow instead

### Optional Enhancements

1. **Upload Progress**
   - Show progress for each file upload
   - R2 direct upload supports progress events

2. **Media Library**
   - Query `GET /content` to show past content
   - Reuse content for new publications

3. **Multi-Platform Publishing**
   - Use `POST /publications/bulk` to publish same content to multiple platforms
   - Customize caption per platform with `customCaption`

## API Endpoint Changes

### New Endpoints
```
POST   /storage/upload-url          - Get presigned upload URL
POST   /content                     - Create content
GET    /content                     - List content
GET    /content/:id                 - Get content
PATCH  /content/:id                 - Update content
POST   /content/:id/media           - Add media
DELETE /content/:id                 - Delete content
DELETE /content/media/:mediaId      - Delete media
```

### Modified Endpoints
```
POST   /publications                - Now requires contentId + mediaIds
POST   /publications/bulk           - Now requires contentId
PATCH  /publications/:id            - Can update mediaIds
```

### Deprecated Endpoints
```
POST   /instagram/schedule          - Still works but deprecated
                                     - Logs warning to use new flow
```

## Testing Checklist

### Backend
- [x] Content creation with media
- [x] Publication creation with media references
- [x] Publication update with media changes
- [x] Bulk publication creation
- [ ] Instagram feed post publishing
- [ ] Instagram story publishing
- [ ] Instagram reel publishing
- [ ] Instagram carousel publishing
- [ ] Cron job execution with new schema

### Frontend Integration
- [ ] Presigned URL generation
- [ ] File upload to R2
- [ ] Content creation after upload
- [ ] Single publication creation
- [ ] Multi-platform publication (bulk)
- [ ] Media library/content list
- [ ] Edit existing publications
- [ ] Delete content/media

## Breaking Changes

1. **Publication DTO Structure**
   - Old: `{ payload: { image_url, caption }, ... }`
   - New: `{ contentId, mediaIds: [{ mediaId }], customCaption, ... }`

2. **Content Model**
   - Removed: `title` field
   - Added: `caption` field

3. **Instagram Schedule Endpoint**
   - Deprecated but still functional
   - Will be removed in future version

## Migration Strategy

### For Existing Data
If you have existing publications with `payload`:
1. Create a migration script to:
   - Extract media URLs from payloads
   - Create Media records
   - Create PublicationMedia relations
   - Clear payload field

### For Frontend
1. Implement new upload flow in parallel
2. Add feature flag to toggle between old/new
3. Test thoroughly
4. Switch to new flow
5. Remove old code

## Environment Variables

No new environment variables required. R2 configuration already exists in `storage.service.ts`.

## Documentation

- ✅ `FRONTEND_INTEGRATION_GUIDE.md` - Complete integration guide with examples
- ✅ Updated Prisma schema in `prisma/schema.prisma`
- ✅ This summary document

## Performance Improvements

1. **Direct Upload**: Files uploaded directly to R2 (no API bottleneck)
2. **Parallel Operations**: Multiple files can upload simultaneously
3. **Reusability**: Same content can be published to multiple platforms without re-uploading
4. **Reduced API Load**: Large file transfers don't go through API server

## Security Improvements

1. **Presigned URLs**: Temporary, scoped access to R2
2. **User-Scoped Keys**: Storage keys include user ID
3. **File Validation**: Size and type validated before presigned URL generation
4. **Media Ownership**: All media queries filtered by user ID

## Next Steps

1. **Frontend Team:**
   - Review `FRONTEND_INTEGRATION_GUIDE.md`
   - Implement new upload flow
   - Test with staging environment
   - Migrate existing code

2. **Backend Team:**
   - Test cron job with real publications
   - Monitor R2 upload performance
   - Add analytics for upload success/failure
   - Consider adding webhook for R2 upload completion

3. **DevOps:**
   - Ensure R2 bucket CORS configured for frontend domain
   - Monitor R2 storage costs
   - Set up alerts for failed uploads

## Files Changed

### Created
- `src/shared/storage/storage.controller.ts`
- `src/shared/storage/dto/storage.dto.ts`
- `src/content/content.module.ts`
- `src/content/content.controller.ts`
- `src/content/content.service.ts`
- `src/content/dto/content.dto.ts`
- `FRONTEND_INTEGRATION_GUIDE.md`
- `SCHEMA_UPDATE_SUMMARY.md` (this file)

### Modified
- `src/app.module.ts` - Added ContentModule
- `src/shared/storage/storage.module.ts` - Added controller
- `src/publications/dto/publication.dto.ts` - Complete refactor
- `src/publications/publication.service.ts` - Updated for new schema
- `src/publishers/instagram.publisher.ts` - Major refactor for media relations
- `src/instagram/instagram.service.ts` - Added deprecation notice
- `prisma/schema.prisma` - Already updated (referenced)

## Support

For questions or issues:
- Backend: Check service logs, test endpoints with Postman/Insomnia
- Frontend: Refer to `FRONTEND_INTEGRATION_GUIDE.md`
- Database: Run `npx prisma studio` to inspect data

## Rollback Plan

If issues arise:
1. Revert database migration (keep backup)
2. Revert code changes via git
3. Redeploy previous version
4. Existing publications with payload will continue to work via old flow
