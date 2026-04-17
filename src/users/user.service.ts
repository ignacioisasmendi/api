import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserPlan, UserStatus } from '@prisma/client';
import { ANALYTICS_PORT, AnalyticsPort } from '../analytics/analytics.port';

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: UserPlan;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  auth0UserId: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified?: boolean;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ANALYTICS_PORT) private readonly analytics: AnalyticsPort,
  ) {}

  /**
   * Encuentra o crea un usuario basado en su auth0UserId
   * Este método se usa durante el login para auto-provisioning
   */
  async findOrCreateUser(userData: CreateUserData): Promise<User> {
    try {
      // Intentar encontrar el usuario por auth0UserId
      let user = await this.prisma.user.findUnique({
        where: { auth0UserId: userData.auth0UserId },
      });

      if (user) {
        // Update emailVerified if it changed (e.g. user just verified)
        if (
          userData.emailVerified !== undefined &&
          userData.emailVerified !== user.emailVerified
        ) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: userData.emailVerified },
          });
          this.logger.log(
            `Updated emailVerified=${userData.emailVerified} for user ${user.id}`,
          );
        }

        // If they were waitlisted but admin already invited (invitedAt set), activate now.
        // Matches invite email timing so the next login works even if the admin upsert missed.
        const emailForWaitlist = (userData.email || user.email || '').trim();
        if (user.status === UserStatus.WAITLISTED && emailForWaitlist) {
          const waitlistEntry = await this.prisma.waitlistEntry.findUnique({
            where: { email: emailForWaitlist },
          });
          if (waitlistEntry?.invitedAt) {
            user = await this.prisma.user.update({
              where: { id: user.id },
              data: {
                status: UserStatus.ACTIVE,
                plan: UserPlan.BETA,
              },
            });
            this.logger.log(
              `Activated waitlisted user ${user.id} (waitlist invite was sent)`,
            );
          }
        }

        return user;
      }

      // Usuario no existe - crear nuevo with waitlist-aware plan/status
      this.logger.log(
        `Creating new user for Auth0 ID: ${userData.auth0UserId}`,
      );

      // Check if the email is on the waitlist
      const waitlistEntry = await this.prisma.waitlistEntry.findUnique({
        where: { email: userData.email },
      });

      let plan: UserPlan = UserPlan.FREE;
      let status: UserStatus = UserStatus.WAITLISTED;

      if (waitlistEntry?.invitedAt) {
        // Invited from waitlist → BETA plan, ACTIVE
        plan = UserPlan.BETA;
        status = UserStatus.ACTIVE;
      } else if (waitlistEntry) {
        // On waitlist but not yet invited → WAITLISTED
        plan = UserPlan.FREE;
        status = UserStatus.WAITLISTED;
      } else {
        // Not on waitlist — during closed beta, default to WAITLISTED
        // After public launch, change this to ACTIVE
        plan = UserPlan.FREE;
        status = UserStatus.WAITLISTED;
      }

      user = await this.prisma.user.create({
        data: {
          auth0UserId: userData.auth0UserId,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          emailVerified: userData.emailVerified ?? false,
          plan,
          status,
        },
      });

      this.logger.log(`New user created with ID: ${user.id}`);

      this.analytics
        .identify({
          userId: user.email,
          email: user.email,
          name: user.name ?? undefined,
          plan: user.plan,
          createdAt: user.createdAt,
        })
        .catch(() => {});

      this.analytics
        .track({
          event: 'User Signed Up',
          userId: user.email,
          properties: { plan: user.plan, status: user.status },
        })
        .catch(() => {});

      return user;
    } catch (error) {
      this.logger.error('Error in findOrCreateUser', error);
      throw error;
    }
  }

  /**
   * Encuentra un usuario por su ID
   */
  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Encuentra un usuario por su auth0UserId
   */
  async findByAuth0Id(auth0UserId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { auth0UserId },
    });
  }

  /**
   * Maps a User entity to a safe response object, stripping auth0UserId
   */
  mapToResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      plan: user.plan,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Actualiza un usuario
   */
  async updateUser(
    userId: string,
    data: {
      email?: string;
      name?: string;
      avatar?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Obtiene el usuario con sus cuentas sociales activas (sin tokens sensibles)
   */
  async getUserWithSocialAccounts(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        socialAccounts: {
          where: { disconnectedAt: null },
          select: {
            id: true,
            platform: true,
            platformUserId: true,
            username: true,
            isActive: true,
            expiresAt: true,
            disconnectedAt: true,
            createdAt: true,
            updatedAt: true,
            // accessToken and refreshToken intentionally excluded
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Desconecta una cuenta social (soft delete)
   */
  async disconnectSocialAccount(userId: string, socialAccountId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: socialAccountId, userId, disconnectedAt: null },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    const [, updatedAccount] = await this.prisma.$transaction([
      this.prisma.publication.deleteMany({
        where: { socialAccountId, status: 'SCHEDULED' },
      }),
      this.prisma.socialAccount.update({
        where: { id: socialAccountId },
        data: {
          disconnectedAt: new Date(),
          isActive: false,
          accessToken: null,
          refreshToken: null,
        },
      }),
    ]);

    return updatedAccount;
  }

  /**
   * Obtiene todas las cuentas sociales de un usuario (activas e inactivas)
   */
  async getAllSocialAccounts(userId: string, clientId?: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId, ...(clientId && { clientId }) },
      select: {
        id: true,
        platform: true,
        platformUserId: true,
        username: true,
        isActive: true,
        expiresAt: true,
        disconnectedAt: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => {
      const meta = account.metadata as { profilePictureUrl?: string } | null;
      return {
        ...account,
        profilePictureUrl: meta?.profilePictureUrl ?? null,
        isExpired: account.expiresAt
          ? new Date(account.expiresAt) < new Date()
          : false,
        needsReauth:
          !account.isActive ||
          (account.expiresAt && new Date(account.expiresAt) < new Date()),
      };
    });
  }
}
