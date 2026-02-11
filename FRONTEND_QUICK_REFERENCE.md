# Frontend Quick Reference - API Updates

## 🚀 Quick Start

### The New 3-Step Flow

```typescript
// 1. Get presigned URL and upload
const { key, publicUrl, uploadUrl } = await getUploadUrl(file);
await uploadToR2(file, uploadUrl);

// 2. Create content
const content = await createContent({
  caption: "My post",
  media: [{ key, url: publicUrl, type: "IMAGE", ... }]
});

// 3. Create publication
const publication = await createPublication({
  contentId: content.id,
  socialAccountId: "acc_123",
  format: "FEED",
  publishAt: new Date(),
  mediaIds: [{ mediaId: content.media[0].id }]
});
```

---

## 📋 API Endpoints

### Storage
```
POST /storage/upload-url
Body: { filename, contentType, mediaType, fileSize, width?, height?, duration? }
Response: { uploadUrl, key, publicUrl }
```

### Content
```
POST   /content                 - Create with media
GET    /content                 - List all
GET    /content/:id             - Get one
PATCH  /content/:id             - Update
DELETE /content/:id             - Delete
```

### Publications
```
POST   /publications            - Create single
POST   /publications/bulk       - Create multiple
GET    /publications            - List
PATCH  /publications/:id        - Update
DELETE /publications/:id        - Delete
```

---

## 📦 TypeScript Interfaces

```typescript
// Upload
interface UploadUrlRequest {
  filename: string;
  contentType: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'THUMBNAIL';
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
}

// Content
interface CreateContentRequest {
  caption?: string;
  media: {
    key: string;
    url: string;
    type: 'IMAGE' | 'VIDEO' | 'THUMBNAIL';
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
    order?: number;
  }[];
}

// Publication
interface CreatePublicationRequest {
  contentId: string;
  socialAccountId: string;
  format: 'FEED' | 'STORY' | 'REEL' | 'CAROUSEL';
  publishAt: string;
  customCaption?: string;
  platformConfig?: any;
  mediaIds: {
    mediaId: string;
    order?: number;
    cropData?: any;
  }[];
}
```

---

## 🎯 Common Use Cases

### Single Image Post

```typescript
async function postImage(file: File, caption: string, accountId: string) {
  // Upload
  const upload = await getUploadUrl(file);
  await uploadToR2(file, upload.uploadUrl);
  
  // Create content
  const content = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caption,
      media: [{
        key: upload.key,
        url: upload.publicUrl,
        type: 'IMAGE',
        mimeType: file.type,
        size: file.size
      }]
    })
  }).then(r => r.json());
  
  // Schedule
  return fetch('/api/publications', {
    method: 'POST',
    body: JSON.stringify({
      contentId: content.id,
      socialAccountId: accountId,
      format: 'FEED',
      publishAt: new Date().toISOString(),
      mediaIds: [{ mediaId: content.media[0].id }]
    })
  }).then(r => r.json());
}
```

### Carousel Post (Multiple Images)

```typescript
async function postCarousel(files: File[], caption: string, accountId: string) {
  // Upload all
  const uploads = await Promise.all(
    files.map(async (file) => {
      const upload = await getUploadUrl(file);
      await uploadToR2(file, upload.uploadUrl);
      return { file, upload };
    })
  );
  
  // Create content
  const content = await fetch('/api/content', {
    method: 'POST',
    body: JSON.stringify({
      caption,
      media: uploads.map((u, i) => ({
        key: u.upload.key,
        url: u.upload.publicUrl,
        type: 'IMAGE',
        mimeType: u.file.type,
        size: u.file.size,
        order: i
      }))
    })
  }).then(r => r.json());
  
  // Schedule as carousel
  return fetch('/api/publications', {
    method: 'POST',
    body: JSON.stringify({
      contentId: content.id,
      socialAccountId: accountId,
      format: 'CAROUSEL',
      publishAt: new Date().toISOString(),
      mediaIds: content.media.map((m, i) => ({
        mediaId: m.id,
        order: i
      }))
    })
  }).then(r => r.json());
}
```

### Multi-Platform Post

```typescript
async function postToMultiplePlatforms(
  files: File[],
  caption: string,
  accountIds: string[]
) {
  // Upload and create content (same as above)
  const uploads = await Promise.all(
    files.map(async (file) => {
      const upload = await getUploadUrl(file);
      await uploadToR2(file, upload.uploadUrl);
      return { file, upload };
    })
  );
  
  const content = await fetch('/api/content', {
    method: 'POST',
    body: JSON.stringify({
      caption,
      media: uploads.map((u, i) => ({
        key: u.upload.key,
        url: u.upload.publicUrl,
        type: 'IMAGE',
        mimeType: u.file.type,
        size: u.file.size,
        order: i
      }))
    })
  }).then(r => r.json());
  
  // Create multiple publications
  return fetch('/api/publications/bulk', {
    method: 'POST',
    body: JSON.stringify({
      contentId: content.id,
      publications: accountIds.map(accountId => ({
        socialAccountId: accountId,
        format: files.length > 1 ? 'CAROUSEL' : 'FEED',
        publishAt: new Date().toISOString(),
        mediaIds: content.media.map((m, i) => ({
          mediaId: m.id,
          order: i
        }))
      }))
    })
  }).then(r => r.json());
}
```

### Video/Reel Post

```typescript
async function postReel(
  video: File,
  caption: string,
  accountId: string,
  thumbnail?: File
) {
  // Upload video
  const videoUpload = await getUploadUrl(video);
  await uploadToR2(video, videoUpload.uploadUrl);
  
  // Upload thumbnail if provided
  let thumbnailUrl;
  if (thumbnail) {
    const thumbUpload = await getUploadUrl(thumbnail);
    await uploadToR2(thumbnail, thumbUpload.uploadUrl);
    thumbnailUrl = thumbUpload.publicUrl;
  }
  
  // Get video metadata
  const { width, height, duration } = await getVideoMetadata(video);
  
  // Create content
  const content = await fetch('/api/content', {
    method: 'POST',
    body: JSON.stringify({
      caption,
      media: [{
        key: videoUpload.key,
        url: videoUpload.publicUrl,
        type: 'VIDEO',
        mimeType: video.type,
        size: video.size,
        width,
        height,
        duration,
        thumbnail: thumbnailUrl
      }]
    })
  }).then(r => r.json());
  
  // Schedule as reel
  return fetch('/api/publications', {
    method: 'POST',
    body: JSON.stringify({
      contentId: content.id,
      socialAccountId: accountId,
      format: 'REEL',
      publishAt: new Date().toISOString(),
      mediaIds: [{ mediaId: content.media[0].id }]
    })
  }).then(r => r.json());
}
```

---

## 🛠 Utility Functions

### Get Image Dimensions

```typescript
function getImageDimensions(file: File): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

### Get Video Metadata

```typescript
function getVideoMetadata(file: File): Promise<{
  width: number,
  height: number,
  duration: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.floor(video.duration)
      });
    };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}
```

### Upload to R2

```typescript
async function uploadToR2(file: File, uploadUrl: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
}
```

---

## ⚠️ Migration Notes

### Old Way (Deprecated)
```typescript
// ❌ DON'T USE
await fetch('/api/instagram/schedule', {
  method: 'POST',
  body: JSON.stringify({
    caption: "Hello",
    mediaUrl: "https://example.com/image.jpg",
    publishAt: new Date(),
    socialAccountId: "acc_123"
  })
});
```

### New Way
```typescript
// ✅ USE THIS
// 1. Upload
const upload = await getUploadUrl(file);
await uploadToR2(file, upload.uploadUrl);

// 2. Create content
const content = await createContent(...);

// 3. Create publication
const pub = await createPublication(...);
```

---

## 🐛 Common Errors

### 400 - Invalid media IDs
**Cause:** Media IDs don't belong to the content
**Fix:** Use media IDs from `content.media[].id`

### 413 - File too large
**Cause:** File exceeds size limit
**Fix:** Check limits (30MB for images, 1GB for videos)

### 401 - Unauthorized
**Cause:** Missing or invalid auth token
**Fix:** Include `Authorization: Bearer <token>` header

### 404 - Content not found
**Cause:** Content ID doesn't exist or doesn't belong to user
**Fix:** Verify content was created and belongs to authenticated user

---

## 📱 Platform-Specific Notes

### Instagram Feed
```typescript
format: 'FEED'  // Single image or carousel
```

### Instagram Story
```typescript
format: 'STORY'
platformConfig: { link: 'https://...' }  // Optional swipe-up
```

### Instagram Reel
```typescript
format: 'REEL'
platformConfig: { share_to_feed: true }  // Optional
```

### Instagram Carousel
```typescript
format: 'CAROUSEL'  // 2-10 images/videos
mediaIds: [...].map((m, i) => ({ mediaId: m.id, order: i }))
```

---

## ✅ Testing Checklist

- [ ] Single image upload
- [ ] Multiple image upload (carousel)
- [ ] Video upload with thumbnail
- [ ] Caption with emojis/special chars
- [ ] Schedule for future date
- [ ] Publish to multiple platforms
- [ ] Edit scheduled post
- [ ] Delete content
- [ ] Handle upload errors
- [ ] Show upload progress

---

## 📚 Additional Resources

- Full guide: `FRONTEND_INTEGRATION_GUIDE.md`
- Backend changes: `SCHEMA_UPDATE_SUMMARY.md`
- API docs: `/api/docs` (if available)

---

## 🆘 Need Help?

1. Check `FRONTEND_INTEGRATION_GUIDE.md` for detailed examples
2. Test endpoints with Postman/Insomnia
3. Check browser console for errors
4. Verify auth token is valid
5. Contact backend team
