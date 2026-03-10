import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginatedResponse,
  PaginationDto,
} from '../common/dto/pagination.dto';
import {
  AdminGrowthPoint,
  AdminOverviewResponse,
  AdminUserDetail,
  AdminUserListItem,
  AdminWaitlistEntry,
  AdminUsersQueryDto,
} from './dto/admin.dto';
import { format, subDays, eachDayOfInterval } from 'date-fns';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<AdminOverviewResponse> {
    const [users, clients, socialAccounts, publications, waitlistEntries] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.client.count(),
        this.prisma.socialAccount.count(),
        this.prisma.publication.count(),
        this.prisma.waitlistEntry.count(),
      ]);

    const [byPlatform, byStatus] = await Promise.all([
      this.prisma.socialAccount.groupBy({
        by: ['platform'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.publication.groupBy({
        by: ['status'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const userGrowth: { date: string; count: number }[] =
      await this.prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::date::text AS date,
               COUNT(*)::int AS count
        FROM "User"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `;

    const pubGrowth: { date: string; count: number }[] =
      await this.prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::date::text AS date,
               COUNT(*)::int AS count
        FROM "Publication"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `;

    return {
      totals: { users, clients, socialAccounts, publications, waitlistEntries },
      socialAccountsByPlatform: byPlatform.map((r) => ({
        platform: r.platform,
        count: r._count.id,
      })),
      publicationsByStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
      growthLast30Days: this.mergeGrowthSeries(userGrowth, pubGrowth),
    };
  }

  async listUsers(
    query: AdminUsersQueryDto,
  ): Promise<PaginatedResponse<AdminUserListItem>> {
    const where = query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { name: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              clients: true,
              socialAccounts: true,
              contents: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data as AdminUserListItem[],
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        clients: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: { select: { socialAccounts: true, contents: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        socialAccounts: {
          select: {
            id: true,
            platform: true,
            username: true,
            isActive: true,
            expiresAt: true,
            disconnectedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { contents: true } },
      },
    });

    return user as AdminUserDetail;
  }

  async getWaitlist(
    query: PaginationDto,
  ): Promise<PaginatedResponse<AdminWaitlistEntry>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.waitlistEntry.findMany({
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, createdAt: true },
      }),
      this.prisma.waitlistEntry.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private mergeGrowthSeries(
    userGrowth: { date: string; count: number }[],
    pubGrowth: { date: string; count: number }[],
  ): AdminGrowthPoint[] {
    const userMap = new Map(userGrowth.map((r) => [r.date, Number(r.count)]));
    const pubMap = new Map(pubGrowth.map((r) => [r.date, Number(r.count)]));

    const end = new Date();
    const start = subDays(end, 29);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const date = format(day, 'yyyy-MM-dd');
      return {
        date,
        users: userMap.get(date) ?? 0,
        publications: pubMap.get(date) ?? 0,
      };
    });
  }
}
