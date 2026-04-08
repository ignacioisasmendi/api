import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ContentFormat, DraftObjective, Platform } from '@prisma/client';

export class CreateDraftDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsOptional()
  @IsString()
  calendarId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];

  @IsOptional()
  @IsEnum(ContentFormat)
  contentType?: ContentFormat;

  @IsOptional()
  @IsEnum(DraftObjective)
  objective?: DraftObjective;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referenceUrl?: string;

  @IsOptional()
  @IsString()
  referenceImageUrl?: string;

  @IsOptional()
  @IsString()
  referenceImageKey?: string;
}

export class UpdateDraftDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  calendarId?: string | null;

  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];

  @IsOptional()
  @IsEnum(ContentFormat)
  contentType?: ContentFormat | null;

  @IsOptional()
  @IsEnum(DraftObjective)
  objective?: DraftObjective | null;

  @IsOptional()
  @IsString()
  caption?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  referenceUrl?: string | null;

  @IsOptional()
  @IsString()
  referenceImageUrl?: string | null;

  @IsOptional()
  @IsString()
  referenceImageKey?: string | null;
}

export class ListDraftsQueryDto {
  @IsOptional()
  @IsString()
  calendarId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
