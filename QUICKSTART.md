# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js (v16+)
- PostgreSQL database
- Instagram account with Graph API access (for testing)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Database
Update your `.env` file with your database URL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/poster_db"
INSTAGRAM_ACCOUNT_ID="your_account_id"
INSTAGRAM_ACCESS_TOKEN="your_access_token"
```

### Step 3: Run Migrations
```bash
npx prisma migrate dev
npx prisma generate
```

### Step 4: Start the Server
```bash
npm run start:dev
```

The server will start on `http://localhost:3000` and the cron job will begin checking for scheduled posts every 30 seconds.

## 📝 Quick Test

### Test 1: Schedule an Instagram Post
```bash
curl -X POST http://localhost:3000/publications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "platform": "INSTAGRAM",
    "format": "FEED",
    "publishAt": "2026-01-25T15:30:00Z",
    "payload": {
      "image_url": "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0",
      "caption": "Hello from the new publication system! 🚀"
    }
  }'
```

### Test 2: Schedule Multiple Platforms at Once
```bash
curl -X POST http://localhost:3000/publications/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Multi-Platform Campaign",
    "publications": [
      {
        "platform": "INSTAGRAM",
        "format": "FEED",
        "publishAt": "2026-01-25T16:00:00Z",
        "payload": {
          "image_url": "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0",
          "caption": "Instagram version #instagram"
        }
      },
      {
        "platform": "FACEBOOK",
        "format": "FEED",
        "publishAt": "2026-01-25T16:00:00Z",
        "payload": {
          "message": "Facebook version",
          "image_url": "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0"
        }
      }
    ]
  }'
```

### Test 3: List All Publications
```bash
curl http://localhost:3000/publications
```

### Test 4: Filter by Platform
```bash
curl http://localhost:3000/instagram/publications
curl http://localhost:3000/publications?platform=INSTAGRAM&status=SCHEDULED
```

### Test 5: Update a Publication
```bash
curl -X PUT http://localhost:3000/publications/YOUR_PUBLICATION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "publishAt": "2026-01-25T17:00:00Z",
    "payload": {
      "image_url": "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0",
      "caption": "Updated caption! 🎉"
    }
  }'
```

### Test 6: Delete a Publication
```bash
curl -X DELETE http://localhost:3000/publications/YOUR_PUBLICATION_ID
```

## 🎯 Understanding the Response

### Successful Creation Response
```json
{
  "id": "clx123abc...",
  "contentId": "clx456def...",
  "platform": "INSTAGRAM",
  "format": "FEED",
  "publishAt": "2026-01-25T16:00:00.000Z",
  "status": "SCHEDULED",
  "error": null,
  "payload": {
    "image_url": "https://...",
    "caption": "..."
  },
  "createdAt": "2026-01-25T14:30:00.000Z"
}
```

### Publication Status Flow
1. `SCHEDULED` - Publication is created and waiting
2. `PUBLISHING` - Cron job picked it up and is publishing
3. `PUBLISHED` - Successfully published to platform ✅
4. `ERROR` - Failed to publish (check `error` field) ❌

## 🔍 Monitoring

### Watch the Logs
```bash
npm run start:dev
```

You'll see logs like:
```
[CronService] Running scheduled publications check...
[CronService] Found 1 publication(s) to publish
[CronService] Publishing INSTAGRAM FEED (clx123abc...)...
[InstagramPublisher] Creating media container...
[InstagramPublisher] Media container created with ID: 123456
[InstagramPublisher] Publishing media...
[CronService] Successfully published INSTAGRAM FEED (clx123abc...): Feed post published successfully to Instagram
```

### Check Database
```bash
npx prisma studio
```

This opens a web UI at `http://localhost:5555` where you can view all Content and Publication records.

## 📚 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/publications` | Create single publication |
| `POST` | `/publications/bulk` | Create multiple publications |
| `GET` | `/publications` | List all publications (supports filters) |
| `GET` | `/publications/:id` | Get specific publication |
| `PUT` | `/publications/:id` | Update publication |
| `DELETE` | `/publications/:id` | Delete publication |
| `GET` | `/instagram/publications` | List Instagram publications |
| `GET` | `/facebook/publications` | List Facebook publications |
| `GET` | `/tiktok/publications` | List TikTok publications |
| `GET` | `/x/publications` | List X/Twitter publications |

## 🎨 Supported Platforms & Formats

| Platform | FEED | STORY | REEL | VIDEO |
|----------|------|-------|------|-------|
| Instagram | ✅ | ✅ | ✅ | - |
| Facebook | 🔜 | 🔜 | - | 🔜 |
| TikTok | - | - | - | 🔜 |
| X (Twitter) | 🔜 | - | - | - |

✅ = Fully implemented
🔜 = Stub ready (needs API integration)

## ⚠️ Important Notes

1. **Time Format**: Always use ISO 8601 format for `publishAt` (e.g., `2026-01-25T16:00:00Z`)
2. **Payload Validation**: Each platform has different required fields - check `ARCHITECTURE.md` for details
3. **Status Updates**: Don't manually update status to `PUBLISHING` - let the cron job handle it
4. **Deletion**: Can't delete publications with status `PUBLISHING`
5. **Updates**: Can't update publications with status `PUBLISHED` or `PUBLISHING`

## 🛠️ Troubleshooting

### Problem: Cron job not running
**Solution**: Check that `@nestjs/schedule` is properly imported in `app.module.ts`

### Problem: Publication not publishing
**Check**:
1. Is `publishAt` in the past?
2. Is status `SCHEDULED`?
3. Check logs for errors
4. Verify API credentials in `.env`

### Problem: Validation errors
**Solution**: Check the payload structure matches the platform requirements in `ARCHITECTURE.md`

### Problem: Database connection error
**Solution**: Verify `DATABASE_URL` in `.env` and ensure PostgreSQL is running

## 📖 Next Steps

1. **Read the Architecture**: Check `ARCHITECTURE.md` for detailed design documentation
2. **See Flow Diagrams**: Check `FLOW_DIAGRAMS.md` to understand the system flow
3. **Implement More Platforms**: Follow the guide in `ARCHITECTURE.md` to add Facebook, TikTok, or X
4. **Add Features**: Consider adding webhooks, analytics, media library, etc.

## 🎉 You're Ready!

The system is fully functional and ready for Instagram. To add more platforms, you just need to:
1. Get API credentials
2. Implement the platform-specific API calls in the publisher class
3. Test it!

Happy publishing! 🚀
