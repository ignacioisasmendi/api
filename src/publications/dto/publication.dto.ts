import {
  IsEnum,
  IsDateString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Platform, ContentFormat, PublicationStatus } from '@prisma/client';

export class PublicationMediaDto {
  @IsString()
  @IsNotEmpty()
  mediaId: string;

  @IsOptional()
  order?: number;

  @IsOptional()
  cropData?: any; // Platform-specific crop/edit data
}

export class CreatePublicationDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @IsString()
  @IsNotEmpty()
  socialAccountId: string;

  @IsEnum(ContentFormat)
  @IsNotEmpty()
  format: ContentFormat;

  @IsDateString()
  @IsNotEmpty()
  publishAt: string;

  @IsString()
  @IsOptional()
  customCaption?: string; // Platform-specific caption override

  @IsObject()
  @IsOptional()
  platformConfig?: any; // Platform-specific settings (e.g., share_to_feed for Reels)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationMediaDto)
  @IsNotEmpty()
  mediaIds: PublicationMediaDto[]; // Media to use from the content
}

export class BulkCreatePublicationDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationItemDto)
  publications: PublicationItemDto[];
}

export class PublicationItemDto {
  @IsString()
  @IsNotEmpty()
  socialAccountId: string;

  @IsEnum(ContentFormat)
  @IsNotEmpty()
  format: ContentFormat;

  @IsDateString()
  @IsNotEmpty()
  publishAt: string;

  @IsString()
  @IsOptional()
  customCaption?: string;

  @IsObject()
  @IsOptional()
  platformConfig?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationMediaDto)
  @IsNotEmpty()
  mediaIds: PublicationMediaDto[];
}

export class UpdatePublicationDto {
  @IsDateString()
  @IsOptional()
  publishAt?: string;

  @IsString()
  @IsOptional()
  customCaption?: string;

  @IsObject()
  @IsOptional()
  platformConfig?: any;

  @IsEnum(PublicationStatus)
  @IsOptional()
  status?: PublicationStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationMediaDto)
  @IsOptional()
  mediaIds?: PublicationMediaDto[];
}

export class MoveKanbanDto {
  @IsString()
  @IsOptional()
  columnId?: string | null;

  @IsOptional()
  kanbanOrder?: number;
}

export class PublicationResponseDto {
  id: string;
  contentId: string;
  socialAccountId: string;
  platform: Platform;
  format: ContentFormat;
  publishAt: Date;
  status: PublicationStatus;
  error?: string;
  customCaption?: string;
  platformConfig?: any;
  platformId?: string; // Platform's internal ID (e.g., Instagram media ID)
  link?: string; // Public URL to the published content
  createdAt: Date;
  updatedAt: Date;
}
