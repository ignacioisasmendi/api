import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS, PlanLimits, PlanFeatureKey } from './plan-limits.config';

export interface UsageSummary {
  plan: UserPlan;
  limits: PlanLimits;
  usage: {
    clients: number;
    socialAccounts: number;
    scheduledPublicationsThisMonth: number;
    calendars: number;
    campaigns: number;
    taskBoards: number;
    shareLinks: number;
  };
}

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  getLimits(plan: UserPlan): PlanLimits {
    return PLAN_LIMITS[plan];
  }

  hasFeature(plan: UserPlan, feature: PlanFeatureKey): boolean {
    return PLAN_LIMITS[plan].features[feature];
  }

  // ── Resource limit assertions ─────────────────────────────────────

  async assertCanCreateClient(userId: string, plan: UserPlan): Promise<void> {
    const count = await this.prisma.client.count({ where: { userId } });
    const limit = PLAN_LIMITS[plan].maxClients;
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${plan} plan allows up to ${limit} clients. Please upgrade to add more.`,
      );
    }
  }

  async assertCanConnectSocialAccount(
    clientId: string,
    plan: UserPlan,
  ): Promise<void> {
    const count = await this.prisma.socialAccount.count({
      where: { clientId, isActive: true, disconnectedAt: null },
    });
    const limit = PLAN_LIMITS[plan].maxSocialAccountsPerClient;
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${plan} plan allows up to ${limit} social accounts per client. Please upgrade to connect more.`,
      );
    }
  }

  async assertCanCreateCalendar(
    clientId: string,
    plan: UserPlan,
  ): Promise<void> {
    const count = await this.prisma.calendar.count({ where: { clientId } });
    const limit = PLAN_LIMITS[plan].maxCalendarsPerClient;
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${plan} plan allows up to ${limit} calendars per client. Please upgrade to create more.`,
      );
    }
  }

  async assertCanCreateCampaign(
    clientId: string,
    plan: UserPlan,
  ): Promise<void> {
    const count = await this.prisma.campaign.count({ where: { clientId } });
    const limit = PLAN_LIMITS[plan].maxCampaignsPerClient;
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${plan} plan allows up to ${limit} campaigns per client. Please upgrade to create more.`,
      );
    }
  }

  async assertCanCreateTaskBoard(
    clientId: string,
    plan: UserPlan,
  ): Promise<void> {
    const count = await this.prisma.taskBoard.count({ where: { clientId } });
    const limit = PLAN_LIMITS[plan].maxTaskBoardsPerClient;
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${plan} plan allows up to ${limit} task boards per client. Please upgrade to create more.`,
      );
    }
  }

  async assertCanSchedulePublication(
    clientId: string,
    plan: UserPlan,
  ): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const count = await this.prisma.publication.count({
      where: {
        content: { clientId },
        createdAt: { gte: startOfMonth },
      },
    });
    const limit = PLAN_LIMITS[plan].maxScheduledPublicationsPerMonth;
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${plan} plan allows up to ${limit} scheduled publications per month. Please upgrade to schedule more.`,
      );
    }
  }

  async assertCanCreateShareLink(
    calendarId: string,
    plan: UserPlan,
  ): Promise<void> {
    const count = await this.prisma.calendarShareLink.count({
      where: { calendarId, isActive: true, revokedAt: null },
    });
    const limit = PLAN_LIMITS[plan].maxShareLinksPerCalendar;
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${plan} plan allows up to ${limit} share links per calendar. Please upgrade to create more.`,
      );
    }
  }

  // ── Usage summary (for the SPA) ──────────────────────────────────

  async getUserUsage(
    userId: string,
    clientId: string,
    plan: UserPlan,
  ): Promise<UsageSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      clients,
      socialAccounts,
      scheduledPublicationsThisMonth,
      calendars,
      campaigns,
      taskBoards,
      shareLinks,
    ] = await this.prisma.$transaction([
      this.prisma.client.count({ where: { userId } }),
      this.prisma.socialAccount.count({
        where: { clientId, isActive: true, disconnectedAt: null },
      }),
      this.prisma.publication.count({
        where: {
          content: { clientId },
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.calendar.count({ where: { clientId } }),
      this.prisma.campaign.count({ where: { clientId } }),
      this.prisma.taskBoard.count({ where: { clientId } }),
      this.prisma.calendarShareLink.count({
        where: {
          calendar: { clientId },
          isActive: true,
          revokedAt: null,
        },
      }),
    ]);

    return {
      plan,
      limits: PLAN_LIMITS[plan],
      usage: {
        clients,
        socialAccounts,
        scheduledPublicationsThisMonth,
        calendars,
        campaigns,
        taskBoards,
        shareLinks,
      },
    };
  }
}
