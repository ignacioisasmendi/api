import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { SharePermission } from '@prisma/client';

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
}
