import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
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
  createdAt: Date;
}

export interface AdminWaitlistGrowthPoint {
  date: string;
  signups: number;
}
