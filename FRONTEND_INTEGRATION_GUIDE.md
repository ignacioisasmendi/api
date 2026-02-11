# Frontend Integration Guide - New Media Upload Flow

This guide explains how to integrate with the updated API that uses the new database schema for content and media management.

## Overview

The new approach separates concerns:
1. **Media files** are uploaded directly from the frontend to Cloudflare R2 (via presigned URLs)
2. **Content** is created with references to the uploaded media
3. **Publications** are scheduled using the content and selecting which media to use

## Architecture Changes

### Old Approach (Deprecated)
```
Frontend → API (with file) → API uploads to R2 → Create publication with payload
```

### New Approach
```
Frontend → Get presigned URL from API
Frontend → Upload directly to R2
Frontend → Create Content with media metadata
Frontend → Create Publication(s) referencing the content
```

## Step-by-Step Implementation

### Step 1: Get Presigned Upload URL

Request a presigned URL for each file you want to upload.

**Endpoint:** `POST /storage/upload-url`

**Request:**
```typescript
interface GenerateUploadUrlRequest {
  filename: string;        // e.g., "photo.jpg"
  contentType: string;     // e.g., "image/jpeg"
  mediaType: 'IMAGE' | 'VIDEO' | 'THUMBNAIL';
  fileSize: number;        // in bytes
  width?: number;          // for images/videos
  height?: number;         // for images/videos
  duration?: number;       // for videos (in seconds)
}
```

**Response:**
```typescript
interface UploadUrlResponse {
  uploadUrl: string;   // Presigned URL for upload
  key: string;         // Storage key (save this!)
  publicUrl: string;   // Public URL for the uploaded file
}
```

**Example:**
```typescript
async function getUploadUrl(file: File): Promise<UploadUrlResponse> {
  const response = await fetch('/api/storage/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      mediaType: file.type.startsWith('image/') ? 'IMAGE' : 'VIDEO',
      fileSize: file.size,
      // Add width, height if available (from image/video metadata)
    }),
  });
  
  return response.json();
}
```

### Step 2: Upload File Directly to R2

Use the presigned URL to upload the file directly to R2.

**Example:**
```typescript
async function uploadToR2(file: File, uploadUrl: string): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
}
```

### Step 3: Create Content with Media

Once all files are uploaded, create the content with media references.

**Endpoint:** `POST /content`

**Request:**
```typescript
interface CreateContentRequest {
  caption?: string;  // Optional caption for the content
  media: MediaItem[];
}

interface MediaItem {
  key: string;           // From step 1 response
  url: string;           // Public URL from step 1 response
  type: 'IMAGE' | 'VIDEO' | 'THUMBNAIL';
  mimeType: string;      // e.g., "image/jpeg"
  size: number;          // File size in bytes
  width?: number;
  height?: number;
  duration?: number;     // For videos
  thumbnail?: string;    // URL of thumbnail (for videos)
  order?: number;        // Order in carousel (0, 1, 2...)
}
```

**Response:**
```typescript
interface Content {
  id: string;
  userId: string;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
  media: Media[];
  publications: Publication[];
}

interface Media {
  id: string;
  contentId: string;
  url: string;
  key: string;
  type: 'IMAGE' | 'VIDEO' | 'THUMBNAIL';
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnail: string | null;
  order: number;
  createdAt: string;
}
```

**Example:**
```typescript
async function createContent(
  caption: string,
  uploadedMedia: UploadUrlResponse[],
  files: File[]
): Promise<Content> {
  const response = await fetch('/api/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      caption,
      media: uploadedMedia.map((upload, index) => ({
        key: upload.key,
        url: upload.publicUrl,
        type: files[index].type.startsWith('image/') ? 'IMAGE' : 'VIDEO',
        mimeType: files[index].type,
        size: files[index].size,
        order: index,
        // Add width, height, duration if available
      })),
    }),
  });
  
  return response.json();
}
```

### Step 4: Create Publication(s)

Create one or more publications for the content.

**Endpoint:** `POST /publications`

**Request:**
```typescript
interface CreatePublicationRequest {
  contentId: string;
  socialAccountId: string;
  format: 'FEED' | 'STORY' | 'REEL' | 'CAROUSEL' | 'VIDEO' | 'ARTICLE' | 'TWEET';
  publishAt: string;              // ISO date string
  customCaption?: string;         // Override content caption for this platform
  platformConfig?: any;           // Platform-specific settings
  mediaIds: PublicationMedia[];   // Which media from content to use
}

interface PublicationMedia {
  mediaId: string;    // Media ID from the content
  order?: number;     // Order for carousels
  cropData?: any;     // Platform-specific crop data
}
```

**Response:**
```typescript
interface Publication {
  id: string;
  contentId: string;
  socialAccountId: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN' | 'X';
  format: string;
  publishAt: string;
  status: 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'ERROR';
  error: string | null;
  customCaption: string | null;
  platformConfig: any;
  platformId: string | null;
  link: string | null;
  createdAt: string;
  updatedAt: string;
  content: Content;
  socialAccount: SocialAccount;
  mediaUsage: PublicationMediaUsage[];
}
```

**Example - Single Publication:**
```typescript
async function createPublication(
  contentId: string,
  socialAccountId: string,
  publishAt: Date
): Promise<Publication> {
  // Get content to access media IDs
  const content = await fetch(`/api/content/${contentId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  }).then(r => r.json());

  const response = await fetch('/api/publications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contentId,
      socialAccountId,
      format: content.media.length > 1 ? 'CAROUSEL' : 'FEED',
      publishAt: publishAt.toISOString(),
      mediaIds: content.media.map((media: Media, index: number) => ({
        mediaId: media.id,
        order: index,
      })),
    }),
  });
  
  return response.json();
}
```

### Step 5: Bulk Create Publications (Multi-Platform)

**Endpoint:** `POST /publications/bulk`

**Request:**
```typescript
interface BulkCreatePublicationRequest {
  contentId: string;
  publications: PublicationItem[];
}

interface PublicationItem {
  socialAccountId: string;
  format: ContentFormat;
  publishAt: string;
  customCaption?: string;
  platformConfig?: any;
  mediaIds: PublicationMedia[];
}
```

**Example:**
```typescript
async function createMultiPlatformPublications(
  contentId: string,
  socialAccounts: string[],
  publishAt: Date
): Promise<Publication[]> {
  const content = await fetch(`/api/content/${contentId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  }).then(r => r.json());

  const response = await fetch('/api/publications/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contentId,
      publications: socialAccounts.map(accountId => ({
        socialAccountId: accountId,
        format: 'FEED',
        publishAt: publishAt.toISOString(),
        mediaIds: content.media.map((media: Media, index: number) => ({
          mediaId: media.id,
          order: index,
        })),
      })),
    }),
  });
  
  return response.json();
}
```

## Complete Example: Upload and Schedule Instagram Post

```typescript
interface UploadAndScheduleParams {
  files: File[];
  caption: string;
  socialAccountId: string;
  publishAt: Date;
}

async function uploadAndSchedulePost({
  files,
  caption,
  socialAccountId,
  publishAt,
}: UploadAndScheduleParams): Promise<Publication> {
  try {
    // Step 1 & 2: Get presigned URLs and upload files
    const uploadPromises = files.map(async (file) => {
      // Get presigned URL
      const urlData = await getUploadUrl(file);
      
      // Upload to R2
      await uploadToR2(file, urlData.uploadUrl);
      
      return { file, urlData };
    });
    
    const uploads = await Promise.all(uploadPromises);
    
    // Step 3: Create content with media
    const content = await createContent(
      caption,
      uploads.map(u => u.urlData),
      uploads.map(u => u.file)
    );
    
    // Step 4: Create publication
    const publication = await createPublication(
      content.id,
      socialAccountId,
      publishAt
    );
    
    return publication;
  } catch (error) {
    console.error('Failed to upload and schedule:', error);
    throw error;
  }
}
```

## React Hook Example

```typescript
import { useState } from 'react';

interface UseUploadAndSchedule {
  upload: (params: UploadAndScheduleParams) => Promise<Publication>;
  isLoading: boolean;
  error: Error | null;
  progress: number;
}

export function useUploadAndSchedule(): UseUploadAndSchedule {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = async (params: UploadAndScheduleParams) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Get presigned URLs
      setProgress(10);
      const urlPromises = params.files.map(file => getUploadUrl(file));
      const uploadData = await Promise.all(urlPromises);
      
      // Step 2: Upload files
      setProgress(30);
      await Promise.all(
        uploadData.map((data, i) => uploadToR2(params.files[i], data.uploadUrl))
      );
      
      // Step 3: Create content
      setProgress(60);
      const content = await createContent(
        params.caption,
        uploadData,
        params.files
      );
      
      // Step 4: Create publication
      setProgress(80);
      const publication = await createPublication(
        content.id,
        params.socialAccountId,
        params.publishAt
      );
      
      setProgress(100);
      return publication;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { upload, isLoading, error, progress };
}
```

## API Endpoints Summary

### Storage
- `POST /storage/upload-url` - Get presigned URL for file upload

### Content
- `POST /content` - Create content with media
- `GET /content` - List all user's content
- `GET /content/:id` - Get specific content
- `PATCH /content/:id` - Update content caption
- `POST /content/:id/media` - Add more media to content
- `DELETE /content/:id` - Delete content
- `DELETE /content/media/:mediaId` - Delete specific media

### Publications
- `POST /publications` - Create single publication
- `POST /publications/bulk` - Create multiple publications for same content
- `GET /publications` - List publications (with filters)
- `GET /publications/:id` - Get specific publication
- `PATCH /publications/:id` - Update publication
- `DELETE /publications/:id` - Delete publication

## Important Notes

### Media Types
- `IMAGE` - Photos, graphics
- `VIDEO` - Video files, reels
- `THUMBNAIL` - Video thumbnails/covers

### Content Formats
- `FEED` - Regular Instagram/Facebook post
- `STORY` - Instagram/Facebook story
- `REEL` - Instagram reel
- `CAROUSEL` - Multiple images/videos
- `VIDEO` - Long-form video
- `ARTICLE` - LinkedIn article
- `TWEET` - X (Twitter) post

### Platform-Specific Configurations

**Instagram Reels:**
```typescript
platformConfig: {
  share_to_feed: true  // Also post to main feed
}
```

**Instagram Stories:**
```typescript
platformConfig: {
  link: 'https://example.com'  // Swipe-up link (requires permissions)
}
```

### Error Handling

Always handle errors at each step:

```typescript
try {
  const urlData = await getUploadUrl(file);
  await uploadToR2(file, urlData.uploadUrl);
  // ... rest of flow
} catch (error) {
  if (error.status === 413) {
    // File too large
  } else if (error.status === 400) {
    // Invalid request
  } else if (error.status === 401) {
    // Unauthorized
  }
  // Handle error appropriately
}
```

### File Size Limits

Check your R2 bucket configuration for file size limits. Typically:
- Images: up to 30MB
- Videos: up to 1GB

### Image/Video Metadata

Extract metadata before upload using browser APIs:

```typescript
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = URL.createObjectURL(file);
  });
}

async function getVideoDimensions(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.floor(video.duration),
      });
    };
    video.src = URL.createObjectURL(file);
  });
}
```

## Migration from Old API

If you're migrating from the old API:

### Old Way (Deprecated)
```typescript
// ❌ Don't use this anymore
await fetch('/api/instagram/schedule', {
  method: 'POST',
  body: JSON.stringify({
    caption: 'Hello',
    mediaUrl: 'https://example.com/image.jpg',
    publishAt: new Date().toISOString(),
    socialAccountId: 'account123',
  }),
});
```

### New Way
```typescript
// ✅ Use this instead
// 1. Upload to R2
const urlData = await getUploadUrl(file);
await uploadToR2(file, urlData.uploadUrl);

// 2. Create content
const content = await createContent(caption, [urlData], [file]);

// 3. Create publication
const publication = await createPublication(
  content.id,
  socialAccountId,
  publishAt
);
```

## Benefits of New Approach

1. **Better Performance**: Direct upload to R2 doesn't go through API server
2. **Reusability**: Create content once, publish to multiple platforms
3. **Flexibility**: Mix and match media for different platforms
4. **Scalability**: Parallel uploads, better for multiple files
5. **Better Error Handling**: Granular control at each step
6. **Cost Effective**: Reduces API server bandwidth usage

## Support

For questions or issues, contact the backend team or refer to the API documentation.
