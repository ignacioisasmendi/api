import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserPlan, UserStatus } from '@prisma/client';

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: UserPlan;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  auth0UserId: string;
  email: string;
  name?: string;
  avatar?: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        // Usuario existe - opcionalmente actualizar información
        // Solo actualizamos si hay cambios (para no hacer writes innecesarios)
        /* const needsUpdate =
          user.email !== userData.email ||
          user.name !== userData.name ||
          user.avatar !== userData.avatar;

        if (needsUpdate) {
          this.logger.log(`Updating user ${user.id} with latest info from Auth0`);
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar,
            },
          });
        } */

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
          plan,
          status,
          // Only create a default client for active users
          ...(status === UserStatus.ACTIVE && {
            clients: {
              create: {
                name: userData.name || userData.email.split('@')[0],
              },
            },
          }),
        },
      });

      this.logger.log(
        `New user created with ID: ${user.id} (with default client)`,
      );
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
