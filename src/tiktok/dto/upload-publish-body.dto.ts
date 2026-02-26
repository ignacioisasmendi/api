import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TikTokPrivacyLevel } from '../tiktok.constants';

/**
 * Body fields for the multipart upload endpoint.
 *
 * Multer parses form-data fields as strings, so boolean flags arrive as
 * "true" / "false".  We use @Transform to coerce them into real booleans
 * so consumers don't have to compare strings manually.
 *
 * Used by:  POST /tiktok/publish/upload/:socialAccountId
 */
export class UploadPublishBodyDto {
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(150, {
    message: 'TikTok video title must be 150 characters or fewer',
  })
  title: string;

  @IsEnum(TikTokPrivacyLevel, {
    message: `privacy_level must be one of: ${Object.values(TikTokPrivacyLevel).join(', ')}`,
  })
  privacy_level: TikTokPrivacyLevel;

  @IsOptional()
  @IsBoolean({ message: 'disable_comment must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  disable_comment: boolean;

  @IsOptional()
  @IsBoolean({ message: 'disable_duet must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  disable_duet: boolean;

  @IsOptional()
  @IsBoolean({ message: 'disable_stitch must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  disable_stitch: boolean;
}
