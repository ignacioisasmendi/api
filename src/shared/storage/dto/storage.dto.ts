import { IsString, IsNotEmpty, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum MediaTypeEnum {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  THUMBNAIL = 'THUMBNAIL',
}

export class GenerateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsEnum(MediaTypeEnum)
  @IsNotEmpty()
  mediaType: MediaTypeEnum;

  @IsInt()
  @Min(1)
  fileSize: number;

  @IsInt()
  @IsOptional()
  width?: number;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsInt()
  @IsOptional()
  duration?: number; // For videos
}

export class UploadUrlResponseDto {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}
