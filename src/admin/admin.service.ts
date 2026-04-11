import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
  AdminGrowthPoint,
  AdminOverviewResponse,
  AdminUserDetail,
  AdminUserListItem,
  AdminWaitlistEntry,
  AdminWaitlistGrowthPoint,
  AdminWaitlistInviteSend,
  AdminWaitlistInviteSendsQueryDto,
  AdminUsersQueryDto,
  AdminWaitlistQueryDto,
  WaitlistInviteSendLogItemDto,
} from './dto/admin.dto';
import { UserPlan, UserStatus } from '@prisma/client';
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

    const userGrowth: { date: string; count: number }[] = await this.prisma
      .$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::date::text AS date,
               COUNT(*)::int AS count
        FROM "User"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `;

    const pubGrowth: { date: string; count: number }[] = await this.prisma
      .$queryRaw`
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
          plan: true,
          status: true,
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
        plan: true,
        status: true,
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
    query: AdminWaitlistQueryDto,
  ): Promise<PaginatedResponse<AdminWaitlistEntry>> {
    const term = query.search?.trim();
    const where =
      term && term.length > 0
        ? { email: { contains: term, mode: 'insensitive' as const } }
        : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.waitlistEntry.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          invitedAt: true,
          createdAt: true,
          _count: { select: { inviteSends: true } },
        },
      }),
      this.prisma.waitlistEntry.count({ where }),
    ]);

    const data: AdminWaitlistEntry[] = rows.map((row) => ({
      id: row.id,
      email: row.email,
      invitedAt: row.invitedAt,
      createdAt: row.createdAt,
      emailSendCount: row._count.inviteSends,
    }));

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

  async getWaitlistExport(): Promise<AdminWaitlistEntry[]> {
    const rows = await this.prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        invitedAt: true,
        createdAt: true,
        _count: { select: { inviteSends: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      invitedAt: row.invitedAt,
      createdAt: row.createdAt,
      emailSendCount: row._count.inviteSends,
    }));
  }

  async getWaitlistGrowth(): Promise<AdminWaitlistGrowthPoint[]> {
    const rows: { date: string; count: number }[] = await this.prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::date::text AS date,
               COUNT(*)::int AS count
        FROM "waitlist_entries"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `;

    const rowMap = new Map(rows.map((r) => [r.date, Number(r.count)]));
    const end = new Date();
    const start = subDays(end, 29);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const date = format(day, 'yyyy-MM-dd');
      return { date, signups: rowMap.get(date) ?? 0 };
    });
  }

  async inviteWaitlistEntry(id: string) {
    const entry = await this.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id },
    });

    if (!entry.invitedAt) {
      await this.prisma.waitlistEntry.update({
        where: { id },
        data: { invitedAt: new Date() },
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: entry.email },
    });

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { status: UserStatus.ACTIVE, plan: UserPlan.BETA },
      });
    }

    return { success: true, email: entry.email };
  }

  async inviteBulk(ids: string[]) {
    const results = await this.prisma.$transaction(async (tx) => {
      const entries = await tx.waitlistEntry.findMany({
        where: { id: { in: ids } },
      });

      const now = new Date();
      for (const e of entries) {
        if (!e.invitedAt) {
          await tx.waitlistEntry.update({
            where: { id: e.id },
            data: { invitedAt: now },
          });
        }
      }

      const emails = entries.map((e) => e.email);
      await tx.user.updateMany({
        where: { email: { in: emails } },
        data: { status: UserStatus.ACTIVE, plan: UserPlan.BETA },
      });

      return {
        invited: entries.length,
        entries: entries.map((e) => ({ id: e.id, email: e.email })),
      };
    });

    return { success: true, ...results };
  }

  async recordWaitlistInviteSendsBatch(
    sends: WaitlistInviteSendLogItemDto[],
  ): Promise<{ recorded: number }> {
    if (sends.length === 0) {
      return { recorded: 0 };
    }

    const ids = [...new Set(sends.map((s) => s.waitlistEntryId))];
    const found = await this.prisma.waitlistEntry.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    });
    const emailById = new Map(found.map((e) => [e.id, e.email]));

    for (const id of ids) {
      if (!emailById.has(id)) {
        throw new BadRequestException(`Unknown waitlist entry: ${id}`);
      }
    }

    await this.prisma.waitlistInviteSend.createMany({
      data: sends.map((s) => ({
        waitlistEntryId: s.waitlistEntryId,
        recipientEmail: emailById.get(s.waitlistEntryId)!,
        templateKey: s.templateKey,
        success: s.success,
        errorMessage: s.errorMessage ?? null,
      })),
    });

    return { recorded: sends.length };
  }

  async listWaitlistInviteSends(
    query: AdminWaitlistInviteSendsQueryDto,
  ): Promise<PaginatedResponse<AdminWaitlistInviteSend>> {
    const where = query.waitlistEntryId
      ? { waitlistEntryId: query.waitlistEntryId }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.waitlistInviteSend.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          waitlistEntryId: true,
          recipientEmail: true,
          templateKey: true,
          success: true,
          errorMessage: true,
          sentAt: true,
        },
      }),
      this.prisma.waitlistInviteSend.count({ where }),
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

  async updateUserPlan(userId: string, plan: UserPlan) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { plan },
      select: { id: true, email: true, plan: true, status: true },
    });
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, plan: true, status: true },
    });
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
