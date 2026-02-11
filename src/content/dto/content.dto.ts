import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsEnum, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '@prisma/client';

export class CreateMediaDto {
  @IsString()
  @IsNotEmpty()
  key: string; // R2 storage key

  @IsString()
  @IsNotEmpty()
  url: string; // Public URL

  @IsEnum(MediaType)
  @IsNotEmpty()
  type: MediaType;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  size: number;

  @IsInt()
  @IsOptional()
  width?: number;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsInt()
  @IsOptional()
  duration?: number; // For videos in seconds

  @IsString()
  @IsOptional()
  thumbnail?: string; // Thumbnail URL for videos

  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number; // Order in carousel/gallery
}

export class CreateContentDto {
  @IsString()
  @IsOptional()
  caption?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMediaDto)
  @IsNotEmpty()
  media: CreateMediaDto[];
}

export class UpdateContentDto {
  @IsString()
  @IsOptional()
  caption?: string;
}

export class AddMediaToContentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMediaDto)
  @IsNotEmpty()
  media: CreateMediaDto[];
}
