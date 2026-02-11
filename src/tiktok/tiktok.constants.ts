/**
 * TikTok Content Posting API constants.
 *
 * Base URL comes from ConfigService ('tiktok.apiUrl') — these are
 * the path segments appended to it.
 */

// ── API Endpoint Paths ──────────────────────────────────────────────
export const TIKTOK_ENDPOINTS = {
  /** Query creator capabilities (privacy levels, duet/stitch/comment) */
  CREATOR_INFO: '/post/publish/creator_info/query/',

  /** Initialize a direct-post (FILE_UPLOAD or PULL_FROM_URL) */
  DIRECT_POST_INIT: '/post/publish/video/init/',

  /** OAuth token endpoint (used for refresh) */
  OAUTH_TOKEN: '/oauth/token/',
} as const;

// ── TikTok Error Codes ──────────────────────────────────────────────
/** Error codes returned in the TikTok API `error.code` field. */
export const TIKTOK_ERROR_CODES = {
  /** The access token has expired or is invalid – trigger a refresh. */
  ACCESS_TOKEN_INVALID: 'access_token_invalid',

  /** Generic "ok" code returned on success. */
  OK: 'ok',

  /** Rate-limit reached. */
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',

  /** The user has not granted the required scope. */
  SCOPE_NOT_AUTHORIZED: 'scope_not_authorized',

  /** Spam risk detected by TikTok. */
  SPAM_RISK_TOO_MANY_POSTS: 'spam_risk_too_many_posts',

  /** Video upload failed on TikTok side. */
  PUBLISH_FAILED: 'publish_failed',
} as const;

// ── Upload Constraints ──────────────────────────────────────────────
/**
 * TikTok allows up to 4 GB per video for direct upload.
 * For PULL_FROM_URL the server fetches the file, so no client-side limit applies.
 */
export const TIKTOK_MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB

/**
 * Recommended chunk size for chunked uploads.
 * TikTok requires a minimum chunk of 5 MB (except the last chunk).
 * We use 10 MB as a safe default.
 */
export const TIKTOK_UPLOAD_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Threshold above which we switch to chunked upload.
 * Files smaller than this are uploaded in a single PUT request.
 */
export const TIKTOK_SINGLE_UPLOAD_MAX_SIZE = 64 * 1024 * 1024; // 64 MB

// ── Privacy Levels ──────────────────────────────────────────────────
export enum TikTokPrivacyLevel {
  PUBLIC_TO_EVERYONE = 'PUBLIC_TO_EVERYONE',
  MUTUAL_FOLLOW_FRIENDS = 'MUTUAL_FOLLOW_FRIENDS',
  FOLLOWER_OF_CREATOR = 'FOLLOWER_OF_CREATOR',
  SELF_ONLY = 'SELF_ONLY',
}

// ── Source Types ─────────────────────────────────────────────────────
export enum TikTokSourceType {
  FILE_UPLOAD = 'FILE_UPLOAD',
  PULL_FROM_URL = 'PULL_FROM_URL',
}
