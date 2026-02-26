import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  TikTokPrivacyLevel,
  TikTokSourceType,
  TIKTOK_MAX_FILE_SIZE_BYTES,
} from '../../tiktok.constants';

/**
 * DTO for initializing a TikTok direct post.
 *
 * Discriminated by `source_type`:
 * - FILE_UPLOAD  → `video_size` is required (bytes); the server will stream-upload the file.
 * - PULL_FROM_URL → `video_url` is required; TikTok pulls the video from the given URL.
 *
 * TikTok-specific constraints:
 * - `title` maps to the video description / caption (max 150 chars).
 * - `privacy_level` must be one the creator's account supports
 *   (validated at runtime via TiktokCreatorService).
 * - `disable_comment`, `disable_duet`, `disable_stitch` let the publisher
 *   override the creator's defaults.
 */
export class InitDirectPostDto {
  // ── Post info ───────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  @MaxLength(150, {
    message: 'TikTok video title must be 150 characters or fewer',
  })
  title: string;

  @IsEnum(TikTokPrivacyLevel, {
    message: `privacy_level must be one of: ${Object.values(TikTokPrivacyLevel).join(', ')}`,
  })
  privacy_level: TikTokPrivacyLevel;

  @IsBoolean()
  disable_comment: boolean;

  @IsBoolean()
  disable_duet: boolean;

  @IsBoolean()
  disable_stitch: boolean;

  // ── Source info ─────────────────────────────────────────────────

  @IsEnum(TikTokSourceType, {
    message: `source_type must be one of: ${Object.values(TikTokSourceType).join(', ')}`,
  })
  source_type: TikTokSourceType;

  /**
   * Required when source_type = PULL_FROM_URL.
   * Must be a publicly accessible URL to the video file.
   */
  @ValidateIf((o) => o.source_type === TikTokSourceType.PULL_FROM_URL)
  @IsUrl({}, { message: 'video_url must be a valid URL' })
  @IsNotEmpty({
    message: 'video_url is required when source_type is PULL_FROM_URL',
  })
  video_url?: string;

  /**
   * Required when source_type = FILE_UPLOAD.
   * Total video file size in bytes (max 4 GB).
   */
  @ValidateIf((o) => o.source_type === TikTokSourceType.FILE_UPLOAD)
  @IsNumber()
  @Min(1, { message: 'video_size must be at least 1 byte' })
  @Max(TIKTOK_MAX_FILE_SIZE_BYTES, { message: 'video_size cannot exceed 4 GB' })
  @IsNotEmpty({
    message: 'video_size is required when source_type is FILE_UPLOAD',
  })
  video_size?: number;

  /**
   * Optional: local file path for FILE_UPLOAD.
   * Used by the publisher to locate the file on disk / in object storage.
   */
  @IsOptional()
  @IsString()
  file_path?: string;
}
