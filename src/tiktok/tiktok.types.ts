/**
 * Typed interfaces that mirror the TikTok Content Posting API
 * response / request shapes.
 *
 * Reference:
 * - https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 * - https://developers.tiktok.com/doc/content-posting-api-get-started
 */

// ── Generic API Envelope ────────────────────────────────────────────

/** Every TikTok v2 response wraps data inside this envelope. */
export interface TikTokApiResponse<T = unknown> {
  data: T;
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

// ── Creator Info ────────────────────────────────────────────────────

export interface CreatorInfoData {
  /** The privacy levels the creator's account supports. */
  privacy_level_options: string[];

  /** Whether the creator has disabled comments at the account level. */
  comment_disabled: boolean;

  /** Whether duet is disabled for the creator. */
  duet_disabled: boolean;

  /** Whether stitch is disabled for the creator. */
  stitch_disabled: boolean;

  /** Maximum video post duration in seconds the creator is allowed. */
  max_video_post_duration_sec: number;
}

export type CreatorInfoResponse = TikTokApiResponse<CreatorInfoData>;

// ── Direct Post Init ────────────────────────────────────────────────

/** Returned when source_type = FILE_UPLOAD. */
export interface FileUploadInitData {
  publish_id: string;
  upload_url: string;
}

/** Returned when source_type = PULL_FROM_URL. */
export interface PullFromUrlInitData {
  publish_id: string;
}

export type DirectPostInitData = FileUploadInitData | PullFromUrlInitData;

export type DirectPostInitResponse = TikTokApiResponse<DirectPostInitData>;

// ── Direct Post Init Request Body ───────────────────────────────────

export interface DirectPostInitRequestBody {
  post_info: {
    title: string;
    privacy_level: string;
    disable_comment: boolean;
    disable_duet?: boolean;
    disable_stitch?: boolean;
  };
  source_info: {
    source: string; // 'FILE_UPLOAD' | 'PULL_FROM_URL'
    video_size?: number; // Required for FILE_UPLOAD
    chunk_size?: number; // Required for FILE_UPLOAD (chunked)
    total_chunk_count?: number; // Required for FILE_UPLOAD (chunked)
    video_url?: string; // Required for PULL_FROM_URL
  };
}

// ── Token Refresh ───────────────────────────────────────────────────

export interface TokenRefreshData {
  access_token: string;
  refresh_token: string;
  /** Seconds until the new access_token expires. */
  expires_in: number;
  /** Seconds until the new refresh_token expires. */
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

/** The refresh endpoint returns a flat object, not the standard envelope. */
export type TokenRefreshResponse = TokenRefreshData;

// ── Helper: check if init data includes an upload_url ───────────────

export function isFileUploadInitData(
  data: DirectPostInitData,
): data is FileUploadInitData {
  return 'upload_url' in data;
}
