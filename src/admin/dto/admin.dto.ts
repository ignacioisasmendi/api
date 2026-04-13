import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserPlan, UserStatus } from '@prisma/client';

export class AdminUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminWaitlistQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateUserPlanDto {
  @IsEnum(UserPlan)
  plan: UserPlan;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class InviteBulkDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class AdminWaitlistInviteSendsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  waitlistEntryId?: string;
}

export class WaitlistInviteSendLogItemDto {
  @IsString()
  waitlistEntryId: string;

  @IsString()
  templateKey: string;

  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class WaitlistInviteSendLogBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaitlistInviteSendLogItemDto)
  sends: WaitlistInviteSendLogItemDto[];
}

export interface AdminTotals {
  users: number;
  clients: number;
  socialAccounts: number;
  publications: number;
  waitlistEntries: number;
}

export interface AdminGrowthPoint {
  date: string;
  users: number;
  publications: number;
}

export interface AdminOverviewResponse {
  totals: AdminTotals;
  socialAccountsByPlatform: { platform: string; count: number }[];
  publicationsByStatus: { status: string; count: number }[];
  growthLast30Days: AdminGrowthPoint[];
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: UserPlan;
  status: UserStatus;
  createdAt: Date;
  _count: {
    clients: number;
    socialAccounts: number;
    contents: number;
  };
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: UserPlan;
  status: UserStatus;
  createdAt: Date;
  clients: {
    id: string;
    name: string;
    createdAt: Date;
    _count: { socialAccounts: number; contents: number };
  }[];
  socialAccounts: {
    id: string;
    platform: string;
    username: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    disconnectedAt: Date | null;
    createdAt: Date;
  }[];
  _count: { contents: number };
}

export interface AdminWaitlistEntry {
  id: string;
  email: string;
  invitedAt: Date | null;
  createdAt: Date;
  emailSendCount: number;
}

export interface AdminWaitlistInviteSend {
  id: string;
  waitlistEntryId: string;
  recipientEmail: string;
  templateKey: string;
  success: boolean;
  errorMessage: string | null;
  sentAt: Date;
}

export interface AdminWaitlistGrowthPoint {
  date: string;
  signups: number;
}

export class AdminUserPublicationsQueryDto extends PaginationDto {}

export interface AdminUserPublication {
  id: string;
  platform: string;
  format: string;
  publishAt: Date;
  status: string;
  customCaption: string | null;
  link: string | null;
  error: string | null;
  socialAccountUsername: string | null;
  clientName: string;
  campaignName: string | null;
  contentCaption: string | null;
}
