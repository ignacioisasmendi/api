import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShareLinkDto } from './dto/share-link.dto';
import { SharePermission, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

type ShareLinkWithMeta = Prisma.CalendarShareLinkGetPayload<{
  include: { _count: { select: { comments: true } } };
}>;

@Injectable()
export class ShareLinkService {
  private readonly logger = new Logger(ShareLinkService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hash a raw token with SHA-256 for storage/lookup.
   */
  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generate a cryptographically random URL-safe token (256 bits).
   */
  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Create a new share link for a calendar.
   * Returns the raw token (shown to the manager only once).
   */
  async createShareLink(
    calendarId: string,
    clientId: string,
    dto: CreateShareLinkDto,
  ): Promise<{ shareLink: ShareLinkWithMeta; rawToken: string }> {
    // Verify calendar ownership
    await this.verifyCalendarOwnership(calendarId, clientId);

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    const shareLink = await this.prisma.calendarShareLink.create({
      data: {
        calendarId,
        tokenHash,
        permission: dto.permission || SharePermission.VIEW_AND_COMMENT,
        label: dto.label,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        _count: { select: { comments: true } },
      },
    });

    this.logger.log(
      `ShareLink created: ${shareLink.id} for calendar ${calendarId}`,
    );

    return { shareLink, rawToken };
  }

  /**
   * List all share links for a calendar.
   */
  async listShareLinks(
    calendarId: string,
    clientId: string,
  ): Promise<ShareLinkWithMeta[]> {
    await this.verifyCalendarOwnership(calendarId, clientId);

    return this.prisma.calendarShareLink.findMany({
      where: { calendarId },
      include: {
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a share link (set isActive = false, revokedAt = now).
   */
  async revokeShareLink(
    calendarId: string,
    linkId: string,
    clientId: string,
  ): Promise<void> {
    await this.verifyCalendarOwnership(calendarId, clientId);

    const link = await this.prisma.calendarShareLink.findFirst({
      where: { id: linkId, calendarId },
    });

    if (!link) {
      throw new NotFoundException(`Share link ${linkId} not found`);
    }

    if (!link.isActive) {
      throw new BadRequestException('Share link is already revoked');
    }

    await this.prisma.calendarShareLink.update({
      where: { id: linkId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    this.logger.log(`ShareLink revoked: ${linkId}`);
  }

  /**
   * Regenerate a share link: revokes the old one and creates a new one
   * in a single transaction. Returns the new raw token.
   */
  async regenerateShareLink(
    calendarId: string,
    linkId: string,
    clientId: string,
  ): Promise<{ shareLink: ShareLinkWithMeta; rawToken: string }> {
    await this.verifyCalendarOwnership(calendarId, clientId);

    const oldLink = await this.prisma.calendarShareLink.findFirst({
      where: { id: linkId, calendarId },
    });

    if (!oldLink) {
      throw new NotFoundException(`Share link ${linkId} not found`);
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    const [, newLink] = await this.prisma.$transaction([
      // Revoke old link
      this.prisma.calendarShareLink.update({
        where: { id: linkId },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      }),
      // Create new link with same settings
      this.prisma.calendarShareLink.create({
        data: {
          calendarId,
          tokenHash,
          permission: oldLink.permission,
          label: oldLink.label,
          expiresAt: oldLink.expiresAt,
        },
        include: {
          _count: { select: { comments: true } },
        },
      }),
    ]);

    this.logger.log(`ShareLink regenerated: old=${linkId} new=${newLink.id}`);

    return { shareLink: newLink, rawToken };
  }

  /**
   * Resolve a share link by its raw token.
   * Validates active status and expiration. Updates access stats.
   */
  async resolveToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const link = await this.prisma.calendarShareLink.findUnique({
      where: { tokenHash },
      include: {
        calendar: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!link) {
      return { status: 'invalid' as const, link: null };
    }

    if (!link.isActive || link.revokedAt) {
      return { status: 'revoked' as const, link: null };
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return { status: 'expired' as const, link: null };
    }

    // Update access stats (debounced: only if last access was >1 min ago)
    const now = new Date();
    const shouldUpdateAccess =
      !link.lastAccessedAt ||
      now.getTime() - link.lastAccessedAt.getTime() > 60_000;

    if (shouldUpdateAccess) {
      await this.prisma.calendarShareLink.update({
        where: { id: link.id },
        data: {
          lastAccessedAt: now,
          accessCount: { increment: 1 },
        },
      });
    }

    this.logger.log(
      `ShareLink accessed: ${link.id}, accessCount: ${link.accessCount + 1}`,
    );

    return { status: 'valid' as const, link };
  }

  private async verifyCalendarOwnership(
    calendarId: string,
    clientId: string,
  ): Promise<void> {
    const calendar = await this.prisma.calendar.findFirst({
      where: { id: calendarId, clientId },
    });

    if (!calendar) {
      throw new NotFoundException(`Calendar ${calendarId} not found`);
    }
  }
}
