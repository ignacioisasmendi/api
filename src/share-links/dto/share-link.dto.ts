import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsArray,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SharePermission } from '@prisma/client';

const SHARE_STATUS_VALUES = ['draft', 'scheduled', 'published'] as const;

export class ShareFilterScopeDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platforms?: string[];

  @IsArray()
  @IsIn(SHARE_STATUS_VALUES, { each: true })
  @IsOptional()
  statuses?: Array<(typeof SHARE_STATUS_VALUES)[number]>;
}

export class CreateShareLinkDto {
  @IsEnum(SharePermission)
  @IsOptional()
  permission?: SharePermission;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ValidateNested()
  @Type(() => ShareFilterScopeDto)
  @IsOptional()
  filterScope?: ShareFilterScopeDto;
}
