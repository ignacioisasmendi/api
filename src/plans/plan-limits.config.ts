import { UserPlan } from '@prisma/client';

export interface PlanFeatures {
  analytics: boolean;
  engagement: boolean;
  shareLinks: boolean;
  bulkScheduling: boolean;
  canva: boolean;
  pexels: boolean;
  taskBoards: boolean;
}

export interface PlanLimits {
  maxClients: number;
  maxSocialAccountsPerClient: number;
  maxScheduledPublicationsPerMonth: number;
  maxCalendarsPerClient: number;
  maxCampaignsPerClient: number;
  maxTaskBoardsPerClient: number;
  maxMediaStorageMB: number;
  maxShareLinksPerCalendar: number;
  features: PlanFeatures;
}

export type PlanFeatureKey = keyof PlanFeatures;

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  BETA: {
    maxClients: 5,
    maxSocialAccountsPerClient: 10,
    maxScheduledPublicationsPerMonth: 200,
    maxCalendarsPerClient: 5,
    maxCampaignsPerClient: 10,
    maxTaskBoardsPerClient: 5,
    maxMediaStorageMB: 1000,
    maxShareLinksPerCalendar: 10,
    features: {
      analytics: true,
      engagement: true,
      shareLinks: true,
      bulkScheduling: true,
      canva: true,
      pexels: true,
      taskBoards: true,
    },
  },
  FREE: {
    maxClients: 1,
    maxSocialAccountsPerClient: 3,
    maxScheduledPublicationsPerMonth: 30,
    maxCalendarsPerClient: 1,
    maxCampaignsPerClient: 1,
    maxTaskBoardsPerClient: 1,
    maxMediaStorageMB: 100,
    maxShareLinksPerCalendar: 2,
    features: {
      analytics: false,
      engagement: false,
      shareLinks: true,
      bulkScheduling: false,
      canva: false,
      pexels: true,
      taskBoards: false,
    },
  },
  STARTER: {
    maxClients: 3,
    maxSocialAccountsPerClient: 5,
    maxScheduledPublicationsPerMonth: 100,
    maxCalendarsPerClient: 3,
    maxCampaignsPerClient: 5,
    maxTaskBoardsPerClient: 3,
    maxMediaStorageMB: 500,
    maxShareLinksPerCalendar: 5,
    features: {
      analytics: true,
      engagement: false,
      shareLinks: true,
      bulkScheduling: true,
      canva: true,
      pexels: true,
      taskBoards: true,
    },
  },
  PRO: {
    maxClients: 10,
    maxSocialAccountsPerClient: 15,
    maxScheduledPublicationsPerMonth: 500,
    maxCalendarsPerClient: 10,
    maxCampaignsPerClient: 20,
    maxTaskBoardsPerClient: 10,
    maxMediaStorageMB: 2000,
    maxShareLinksPerCalendar: 20,
    features: {
      analytics: true,
      engagement: true,
      shareLinks: true,
      bulkScheduling: true,
      canva: true,
      pexels: true,
      taskBoards: true,
    },
  },
  ENTERPRISE: {
    maxClients: 50,
    maxSocialAccountsPerClient: 50,
    maxScheduledPublicationsPerMonth: 5000,
    maxCalendarsPerClient: 50,
    maxCampaignsPerClient: 100,
    maxTaskBoardsPerClient: 50,
    maxMediaStorageMB: 10000,
    maxShareLinksPerCalendar: 100,
    features: {
      analytics: true,
      engagement: true,
      shareLinks: true,
      bulkScheduling: true,
      canva: true,
      pexels: true,
      taskBoards: true,
    },
  },
};
