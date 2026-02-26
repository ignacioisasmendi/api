# Backend API Contract

## Global

- Base URL: `http://localhost:5000` (or `PORT` env)
- API Version: No prefix (global prefix `/v1` is commented out)
- Auth Type: Bearer JWT (Auth0 RS256 JWKS)
- Auth Header Format: `Authorization: Bearer <token>`
- Common Headers:
  - `Authorization: Bearer <token>` — required on all non-public routes
  - `X-Client-Id: <uuid>` — optional, resolved by ClientInterceptor; falls back to user's first client
  - `Content-Type: application/json`
- Rate Limits:
  - Global: 60 req/min (short), 1000 req/hour (long)
  - Share link creation: 20 req/hour
  - Public share endpoints: 60 req/min (reads), 10 req/min (writes)
- Date format: ISO 8601 (`2026-02-26T12:00:00.000Z`)
- Pagination: query-based, see `PaginationQuery` in Shared Types
- Validation: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Error format: see `ErrorResponse` in Shared Types

---

## Endpoints

---

### [GET] /

**Auth:** none (`@IsPublic`)
**Description:** Health check / hello

#### Response 200
```ts
string // "Hello World!"
```

---

### [GET] /me

**Auth:** required
**Description:** Get authenticated user profile (legacy, prefer /users/me)

#### Response 200
```ts
{ message: string; user: User }
```

---

## Users

### [GET] /users/me

**Auth:** required
**Description:** Get authenticated user profile

#### Response 200
```ts
type UserResponse = {
  id: string
  email: string
  name: string | null
  avatar: string | null
  auth0Id: string
  createdAt: string
  updatedAt: string
}
```

---

### [GET] /users/me/full

**Auth:** required
**Description:** Get user profile with social accounts (tokens stripped)

#### Response 200
```ts
type UserWithSocialAccounts = UserResponse & {
  socialAccounts: SocialAccountSafe[]
}
```

---

### [GET] /users/me/social-accounts

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Get all social accounts (active and inactive) for current client

#### Response 200
```ts
SocialAccountSafe[]
```

---

### [DELETE] /users/me/social-accounts/:id

**Auth:** required
**Description:** Disconnect a social account

#### Path params
```ts
{ id: string }
```

#### Response 204
No content.

---

### [PUT] /users/me

**Auth:** required
**Description:** Update user profile

#### Request
```ts
type UpdateUserDto = {
  name?: string   // @IsString @MaxLength(100)
  avatar?: string // @IsString
}
```

#### Response 200
```ts
UserResponse
```

---

## Clients

> All client routes use `@SkipClientValidation()` — no `X-Client-Id` needed.

### [POST] /clients

**Auth:** required
**Description:** Create a new client

#### Request
```ts
type CreateClientDto = {
  name: string    // @IsString @IsNotEmpty @MaxLength(100)
  avatar?: string // @IsString
}
```

#### Response 201
```ts
Client
```

---

### [GET] /clients

**Auth:** required
**Description:** List all clients for user

#### Response 200
```ts
Client[]
```

---

### [GET] /clients/:id

**Auth:** required
**Description:** Get a specific client

#### Path params
```ts
{ id: string }
```

#### Response 200
```ts
Client
```

---

### [PATCH] /clients/:id

**Auth:** required
**Description:** Update a client

#### Path params
```ts
{ id: string }
```

#### Request
```ts
type UpdateClientDto = {
  name?: string   // @IsString @MaxLength(100)
  avatar?: string // @IsString
}
```

#### Response 200
```ts
Client
```

---

### [DELETE] /clients/:id

**Auth:** required
**Description:** Delete a client

#### Path params
```ts
{ id: string }
```

#### Response 204
No content.

---

## Calendars

### [POST] /calendars

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Create a new calendar

#### Request
```ts
type CreateCalendarDto = {
  name: string          // @IsString @IsNotEmpty @MaxLength(255)
  description?: string  // @IsString @MaxLength(1000)
}
```

#### Response 201
```ts
Calendar
```

---

### [GET] /calendars

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** List all calendars for current client

#### Response 200
```ts
Calendar[]
```

---

### [GET] /calendars/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Get calendar with all content and publications

#### Path params
```ts
{ id: string }
```

#### Response 200
```ts
CalendarWithRelations
```

---

### [PATCH] /calendars/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Update a calendar

#### Path params
```ts
{ id: string }
```

#### Request
```ts
type UpdateCalendarDto = {
  name?: string         // @IsString @MaxLength(255)
  description?: string  // @IsString @MaxLength(1000)
}
```

#### Response 200
```ts
Calendar
```

---

### [DELETE] /calendars/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Delete calendar (cascades share links and comments)

#### Path params
```ts
{ id: string }
```

#### Response 204
No content.

---

### [POST] /calendars/:id/contents

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Assign a content to this calendar

#### Path params
```ts
{ id: string }
```

#### Request
```ts
type AssignContentDto = {
  contentId: string // @IsString @IsNotEmpty
}
```

#### Response 204
No content.

---

### [DELETE] /calendars/:id/contents/:contentId

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Remove a content from this calendar

#### Path params
```ts
{ id: string; contentId: string }
```

#### Response 204
No content.

---

## Calendar Comments (Manager)

### [GET] /calendars/:calendarId/comments

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** List all comments for a calendar (manager view)

#### Path params
```ts
{ calendarId: string }
```

#### Response 200
```ts
Comment[]
```

---

### [POST] /calendars/:calendarId/comments

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Manager posts a comment

#### Path params
```ts
{ calendarId: string }
```

#### Request
```ts
type CreateManagerCommentDto = {
  body: string            // @IsString @IsNotEmpty @MinLength(1) @MaxLength(2000)
  publicationId?: string  // @IsString — scope comment to a specific publication
}
```

#### Response 201
```ts
Comment
```

---

### [PATCH] /calendars/:calendarId/comments/:commentId/resolve

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Resolve a comment (hide from client view)

#### Path params
```ts
{ calendarId: string; commentId: string }
```

#### Response 200
```ts
Comment
```

---

### [DELETE] /calendars/:calendarId/comments/:commentId

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Delete a comment permanently

#### Path params
```ts
{ calendarId: string; commentId: string }
```

#### Response 204
No content.

---

## Kanban Columns

### [GET] /calendars/:calendarId/columns

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** List all kanban columns for a calendar

#### Path params
```ts
{ calendarId: string }
```

#### Response 200
```ts
KanbanColumn[]
```

---

### [POST] /calendars/:calendarId/columns

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Create a kanban column

#### Path params
```ts
{ calendarId: string }
```

#### Request
```ts
type CreateKanbanColumnDto = {
  name: string           // @IsString
  mappedStatus?: string  // @IsString — maps to PublicationStatus
  color?: string         // @IsString
}
```

#### Response 201
```ts
KanbanColumn
```

---

### [PATCH] /calendars/:calendarId/columns/:columnId

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Update a kanban column

#### Path params
```ts
{ calendarId: string; columnId: string }
```

#### Request
```ts
type UpdateKanbanColumnDto = {
  name?: string          // @IsString
  mappedStatus?: string  // @IsString
  color?: string         // @IsString
  order?: number         // @IsInt
}
```

#### Response 200
```ts
KanbanColumn
```

---

### [DELETE] /calendars/:calendarId/columns/:columnId

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Delete a kanban column

#### Path params
```ts
{ calendarId: string; columnId: string }
```

#### Response 204
No content.

---

### [PUT] /calendars/:calendarId/columns/reorder

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Reorder all columns

#### Path params
```ts
{ calendarId: string }
```

#### Request
```ts
type ReorderColumnsDto = {
  columnIds: string[] // @IsArray @IsString(each) @ArrayMinSize(1)
}
```

#### Response 200
```ts
KanbanColumn[]
```

---

## Share Links

### [POST] /calendars/:calendarId/share-links

**Auth:** required
**Headers:** `X-Client-Id`
**Rate Limit:** 20 per hour
**Description:** Generate a new share link for a calendar

#### Path params
```ts
{ calendarId: string }
```

#### Request
```ts
type CreateShareLinkDto = {
  permission?: SharePermission // @IsEnum — default VIEW_ONLY
  label?: string               // @IsString @MaxLength(255)
  expiresAt?: string           // @IsDateString — ISO 8601
}
```

#### Response 201
```ts
ShareLink
```

---

### [GET] /calendars/:calendarId/share-links

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** List all share links for a calendar

#### Path params
```ts
{ calendarId: string }
```

#### Response 200
```ts
ShareLink[]
```

---

### [DELETE] /calendars/:calendarId/share-links/:linkId

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Revoke a share link

#### Path params
```ts
{ calendarId: string; linkId: string }
```

#### Response 204
No content.

---

### [POST] /calendars/:calendarId/share-links/:linkId/regenerate

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Regenerate a share link (revokes old, creates new)

#### Path params
```ts
{ calendarId: string; linkId: string }
```

#### Response 200
```ts
ShareLink
```

---

## Content

### [POST] /content

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Create content with media

#### Request
```ts
type CreateContentDto = {
  caption?: string          // @IsString
  media: CreateMediaDto[]   // @IsArray @ValidateNested
}
```

#### Response 201
```ts
Content
```

---

### [GET] /content

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** List all content for current client

#### Response 200
```ts
Content[]
```

---

### [GET] /content/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Get specific content by ID

#### Path params
```ts
{ id: string }
```

#### Response 200
```ts
Content
```

---

### [PATCH] /content/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Update content caption

#### Path params
```ts
{ id: string }
```

#### Request
```ts
type UpdateContentDto = {
  caption?: string // @IsString
}
```

#### Response 200
```ts
Content
```

---

### [POST] /content/:id/media

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Add more media to existing content

#### Path params
```ts
{ id: string }
```

#### Request
```ts
type AddMediaToContentDto = {
  media: CreateMediaDto[] // @IsArray @ValidateNested
}
```

#### Response 200
```ts
Content
```

---

### [DELETE] /content/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Delete content

#### Path params
```ts
{ id: string }
```

#### Response 204
No content.

---

### [DELETE] /content/media/:mediaId

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Delete specific media from content

#### Path params
```ts
{ mediaId: string }
```

#### Response 204
No content.

---

## Publications

### [POST] /publications

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Create a single publication

#### Request
```ts
type CreatePublicationDto = {
  contentId: string                // @IsString @IsNotEmpty
  socialAccountId: string          // @IsString @IsNotEmpty
  format: ContentFormat            // @IsEnum
  publishAt: string                // @IsDateString — ISO 8601
  customCaption?: string           // @IsString — platform-specific override
  platformConfig?: any             // @IsObject — platform-specific settings
  mediaIds: PublicationMediaDto[]  // @IsArray @ValidateNested — media from content
}
```

#### Response 201
```ts
PublicationResponse
```

---

### [GET] /publications

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** List publications with optional filters (paginated)

#### Query params
```ts
type Query = PaginationQuery & {
  platform?: Platform          // filter by platform
  status?: PublicationStatus   // filter by status
  contentId?: string           // filter by content
  calendarId?: string          // filter by calendar
}
```

#### Response 200
```ts
PaginatedResponse<PublicationResponse>
```

---

### [GET] /publications/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Get a specific publication

#### Path params
```ts
{ id: string }
```

#### Response 200
```ts
PublicationResponse
```

---

### [PUT] /publications/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Update a publication

#### Path params
```ts
{ id: string }
```

#### Request
```ts
type UpdatePublicationDto = {
  publishAt?: string                // @IsDateString
  customCaption?: string            // @IsString
  platformConfig?: any              // @IsObject
  status?: PublicationStatus        // @IsEnum
  mediaIds?: PublicationMediaDto[]  // @IsArray @ValidateNested
}
```

#### Response 200
```ts
PublicationResponse
```

---

### [DELETE] /publications/:id

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Delete a publication

#### Path params
```ts
{ id: string }
```

#### Response 204
No content.

---

### [PATCH] /publications/:id/kanban

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Move publication to a kanban column

#### Path params
```ts
{ id: string }
```

#### Request
```ts
type MoveKanbanDto = {
  columnId?: string | null  // @IsString — null to unassign
  kanbanOrder?: number      // position within column
}
```

#### Response 200
```ts
PublicationResponse
```

---

## Platform-Specific Publication Lists

These are convenience endpoints that pre-filter by platform. Same response as `GET /publications`.

### [GET] /instagram/publications

**Auth:** required
**Headers:** `X-Client-Id`

#### Query params
```ts
PaginationQuery & { status?: PublicationStatus }
```

#### Response 200
```ts
PaginatedResponse<PublicationResponse>
```

---

### [GET] /facebook/publications

**Auth:** required
**Headers:** `X-Client-Id`

#### Query params
```ts
PaginationQuery & { status?: PublicationStatus }
```

#### Response 200
```ts
PaginatedResponse<PublicationResponse>
```

---

### [GET] /tiktok/publications

**Auth:** required
**Headers:** `X-Client-Id`

#### Query params
```ts
PaginationQuery & { status?: PublicationStatus }
```

#### Response 200
```ts
PaginatedResponse<PublicationResponse>
```

---

### [GET] /x/publications

**Auth:** required
**Headers:** `X-Client-Id`

#### Query params
```ts
PaginationQuery & { status?: PublicationStatus }
```

#### Response 200
```ts
PaginatedResponse<PublicationResponse>
```

---

## Storage

### [POST] /storage/upload-url

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Generate a presigned URL for direct upload to Cloudflare R2

#### Request
```ts
type GenerateUploadUrlDto = {
  filename: string          // @IsString @IsNotEmpty
  contentType: string       // @IsString @IsNotEmpty — MIME type
  mediaType: MediaTypeEnum  // @IsEnum — IMAGE | VIDEO | THUMBNAIL
  fileSize: number          // @IsInt @Min(1)
  width?: number            // @IsInt
  height?: number           // @IsInt
  duration?: number         // @IsInt — for videos, in seconds
}
```

#### Response 200
```ts
type UploadUrlResponse = {
  uploadUrl: string  // presigned PUT URL (1h expiry)
  key: string        // R2 storage key
  publicUrl: string  // public URL after upload
}
```

---

## Instagram

### [POST] /instagram/publish

**Auth:** required
**Description:** Publish an Instagram post immediately

#### Request
```ts
type CreatePostDto = {
  image_url: string  // @IsUrl @IsNotEmpty
  caption: string    // @IsString @IsNotEmpty
}
```

#### Response 200
```ts
any // Instagram API response
```

---

### [POST] /instagram/schedule

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Schedule an Instagram post

#### Request
```ts
type SchedulePostDto = {
  caption: string          // @IsString @IsNotEmpty
  mediaUrl: string         // @IsUrl @IsNotEmpty
  publishAt: string        // @IsDateString @IsNotEmpty
  socialAccountId: string  // @IsString @IsNotEmpty
}
```

#### Response 201
```ts
any // Created publication
```

---

## TikTok

### [GET] /tiktok/creator-info/:socialAccountId

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Query TikTok creator posting capabilities

#### Path params
```ts
{ socialAccountId: string }
```

#### Response 200
```ts
{
  success: true
  data: {
    privacy_level_options: TikTokPrivacyLevel[]
    comment_disabled: boolean
    duet_disabled: boolean
    stitch_disabled: boolean
    max_video_post_duration_sec: number
  }
}
```

---

### [POST] /tiktok/publish/init

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Initialize a TikTok direct post (PULL_FROM_URL or FILE_UPLOAD)

#### Request
```ts
type InitDirectPostWithAccountDto = {
  socialAccountId: string            // @IsString @IsNotEmpty
  title: string                      // @IsString @IsNotEmpty @MaxLength(150)
  privacy_level: TikTokPrivacyLevel  // @IsEnum
  disable_comment: boolean           // @IsBoolean
  disable_duet: boolean              // @IsBoolean
  disable_stitch: boolean            // @IsBoolean
  source_type: TikTokSourceType      // @IsEnum — FILE_UPLOAD | PULL_FROM_URL
  video_url?: string                 // @IsUrl — required if PULL_FROM_URL
  video_size?: number                // @IsNumber @Min(1) @Max(4GB) — required if FILE_UPLOAD
  file_path?: string                 // @IsString — optional
}
```

#### Response 200
```ts
{
  success: true
  data: {
    publish_id: string
    upload_url?: string // only for FILE_UPLOAD
  }
}
```

---

### [POST] /tiktok/publish/upload/:socialAccountId

**Auth:** required
**Headers:** `X-Client-Id`
**Content-Type:** multipart/form-data
**Description:** Upload video file and publish to TikTok (FILE_UPLOAD flow)

#### Path params
```ts
{ socialAccountId: string }
```

#### Request (multipart/form-data)
```ts
type UploadPublishBody = {
  file: File                         // video file (max 4GB, video/* only)
  title: string                      // @IsString @IsNotEmpty @MaxLength(150)
  privacy_level: TikTokPrivacyLevel  // @IsEnum
  disable_comment?: boolean          // @IsBoolean — sent as "true"/"false" string
  disable_duet?: boolean             // @IsBoolean
  disable_stitch?: boolean           // @IsBoolean
}
```

#### Response 200
```ts
{
  success: true
  data: {
    publish_id: string
    message: string
  }
}
```

---

## OAuth

### [POST] /auth/instagram/callback

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Exchange Instagram OAuth code for tokens and link social account

#### Request
```ts
type IgOauthCallbackDto = {
  code: string   // @IsString @IsNotEmpty
  state: string  // @IsString @IsNotEmpty
}
```

#### Response 200
```ts
{ success: true }
```

---

### [POST] /auth/tiktok/callback

**Auth:** required
**Headers:** `X-Client-Id`
**Description:** Exchange TikTok OAuth code for tokens and link social account

#### Request
```ts
type TkOauthCallbackDto = {
  code: string   // @IsString @IsNotEmpty
  state: string  // @IsString @IsNotEmpty
}
```

#### Response 200
```ts
{ success: true }
```

---

## Public Share (No Auth)

> All routes under `/shared` are `@IsPublic()` — no JWT required.
> Commenter identity tracked via `planer_commenter_id` httpOnly cookie (90-day TTL).

### [GET] /shared/:token

**Auth:** none
**Rate Limit:** 60 req/min per IP
**Description:** Get shared calendar view (validates token and expiry)

#### Path params
```ts
{ token: string }
```

#### Response 200
```ts
SharedCalendarView // Calendar with contents and publications (tokens stripped)
```

---

### [GET] /shared/:token/comments

**Auth:** none
**Description:** Get comments for shared calendar (cursor-based pagination)

#### Path params
```ts
{ token: string }
```

#### Query params
```ts
{
  cursor?: string          // comment ID for cursor pagination
  limit?: string           // default "20"
  publicationId?: string   // filter by publication
}
```

#### Response 200
```ts
{
  data: Comment[]
  nextCursor: string | null
}
```

---

### [POST] /shared/:token/comments

**Auth:** none (cookie-tracked)
**Rate Limit:** 10 req/min per IP
**Description:** Post a comment on shared calendar

#### Path params
```ts
{ token: string }
```

#### Request
```ts
type CreatePublicCommentDto = {
  body: string            // @IsString @IsNotEmpty @MinLength(1) @MaxLength(2000)
  authorName: string      // @IsString @IsNotEmpty @MaxLength(100)
  authorEmail?: string    // @IsEmail
  publicationId?: string  // @IsString — scope to a publication
}
```

#### Response 201
```ts
Comment
```

---

### [PATCH] /shared/:token/comments/:commentId

**Auth:** none (cookie-tracked, owner only, within 15 min)
**Rate Limit:** 10 req/min per IP
**Description:** Edit own comment

#### Path params
```ts
{ token: string; commentId: string }
```

#### Request
```ts
type UpdatePublicCommentDto = {
  body: string // @IsString @IsNotEmpty @MinLength(1) @MaxLength(2000)
}
```

#### Response 200
```ts
Comment
```

---

### [DELETE] /shared/:token/comments/:commentId

**Auth:** none (cookie-tracked, owner only, within 15 min)
**Description:** Delete own comment

#### Path params
```ts
{ token: string; commentId: string }
```

#### Response 204
No content.

---

## Shared Types

### PaginationQuery
```ts
type PaginationQuery = {
  page?: number  // @IsInt @Min(1) — default 1
  limit?: number // @IsInt @Min(1) @Max(100) — default 20
}
```

### PaginatedResponse
```ts
type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

### ErrorResponse
```ts
type ErrorResponse = {
  statusCode: number
  timestamp: string      // ISO 8601
  path: string
  method: string
  message: string | { message: string | string[]; error: string; statusCode: number }
  error: string          // error class name
}
```

### ValidationErrorResponse
```ts
// NestJS ValidationPipe produces this shape inside `message`:
type ValidationErrorResponse = {
  statusCode: 400
  timestamp: string
  path: string
  method: string
  message: {
    message: string[]    // array of validation error messages
    error: 'Bad Request'
    statusCode: 400
  }
  error: 'BadRequestException'
}
```

### Platform
```ts
enum Platform {
  INSTAGRAM = 'INSTAGRAM'
  FACEBOOK = 'FACEBOOK'
  TIKTOK = 'TIKTOK'
  LINKEDIN = 'LINKEDIN'
  X = 'X'
}
```

### ContentFormat
```ts
enum ContentFormat {
  FEED = 'FEED'
  STORY = 'STORY'
  REEL = 'REEL'
  VIDEO = 'VIDEO'
  CAROUSEL = 'CAROUSEL'
  ARTICLE = 'ARTICLE'
  TWEET = 'TWEET'
}
```

### PublicationStatus
```ts
enum PublicationStatus {
  SCHEDULED = 'SCHEDULED'
  PUBLISHING = 'PUBLISHING'
  PUBLISHED = 'PUBLISHED'
  ERROR = 'ERROR'
}
```

### MediaType
```ts
enum MediaType {
  IMAGE = 'IMAGE'
  VIDEO = 'VIDEO'
  THUMBNAIL = 'THUMBNAIL'
}
```

### SharePermission
```ts
enum SharePermission {
  VIEW_ONLY = 'VIEW_ONLY'
  VIEW_AND_COMMENT = 'VIEW_AND_COMMENT'
}
```

### TikTokPrivacyLevel
```ts
enum TikTokPrivacyLevel {
  PUBLIC_TO_EVERYONE = 'PUBLIC_TO_EVERYONE'
  MUTUAL_FOLLOW_FRIENDS = 'MUTUAL_FOLLOW_FRIENDS'
  FOLLOWER_OF_CREATOR = 'FOLLOWER_OF_CREATOR'
  SELF_ONLY = 'SELF_ONLY'
}
```

### TikTokSourceType
```ts
enum TikTokSourceType {
  FILE_UPLOAD = 'FILE_UPLOAD'
  PULL_FROM_URL = 'PULL_FROM_URL'
}
```

### CreateMediaDto
```ts
type CreateMediaDto = {
  key: string        // @IsString @IsNotEmpty — R2 storage key
  url: string        // @IsString @IsNotEmpty — public URL
  type: MediaType    // @IsEnum
  mimeType: string   // @IsString @IsNotEmpty
  size: number       // @IsInt @Min(1) — bytes
  width?: number     // @IsInt
  height?: number    // @IsInt
  duration?: number  // @IsInt — seconds (videos)
  thumbnail?: string // @IsString — thumbnail URL (videos)
  order?: number     // @IsInt @Min(0) — carousel/gallery order
}
```

### PublicationMediaDto
```ts
type PublicationMediaDto = {
  mediaId: string  // @IsString @IsNotEmpty
  order?: number   // display order
  cropData?: any   // platform-specific crop/edit data
}
```

### PublicationResponse
```ts
type PublicationResponse = {
  id: string
  contentId: string
  socialAccountId: string
  platform: Platform
  format: ContentFormat
  publishAt: string          // ISO 8601
  status: PublicationStatus
  error?: string
  customCaption?: string
  platformConfig?: any
  platformId?: string        // platform's internal ID
  link?: string              // public URL to published content
  createdAt: string
  updatedAt: string
}
```

### SocialAccountSafe
```ts
// Tokens (accessToken, refreshToken) are never exposed in API responses
type SocialAccountSafe = {
  id: string
  userId: string
  clientId: string
  platform: Platform
  platformUserId: string
  username: string | null
  isActive: boolean
  expiresAt: string | null
  disconnectedAt: string | null
  createdAt: string
  updatedAt: string
}
```

### KanbanColumn
```ts
type KanbanColumn = {
  id: string
  calendarId: string
  name: string
  mappedStatus: string | null
  color: string | null
  order: number
  createdAt: string
  updatedAt: string
}
```
