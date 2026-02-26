import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShareLinkService } from '../share-links/share-link.service';
import {
  CreatePublicCommentDto,
  UpdatePublicCommentDto,
} from './dto/public-comment.dto';
import { SharePermission } from '@prisma/client';

// 15 minutes in milliseconds
const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class PublicShareService {
  private readonly logger = new Logger(PublicShareService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shareLinkService: ShareLinkService,
  ) {}

  /**
   * Get the shared calendar view. Validates token and returns filtered data.
   */
  async getSharedCalendar(rawToken: string) {
    const resolved = await this.shareLinkService.resolveToken(rawToken);

    if (resolved.status !== 'valid' || !resolved.link) {
      return {
        status: resolved.status,
        calendar: null,
        permission: null,
      };
    }

    const { link } = resolved;

    // Fetch calendar with publications (filtered fields only)
    const calendar = await this.prisma.calendar.findUnique({
      where: { id: link.calendarId },
      select: {
        id: true,
        name: true,
        description: true,
        user: {
          select: { name: true },
        },
        kanbanColumns: {
          select: {
            id: true,
            calendarId: true,
            name: true,
            order: true,
            mappedStatus: true,
            color: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { order: 'asc' },
        },
        contents: {
          select: {
            id: true,
            caption: true,
            media: {
              select: {
                id: true,
                url: true,
                type: true,
                mimeType: true,
                width: true,
                height: true,
                duration: true,
                thumbnail: true,
                order: true,
              },
              orderBy: { order: 'asc' },
            },
            publications: {
              select: {
                id: true,
                platform: true,
                format: true,
                publishAt: true,
                status: true,
                customCaption: true,
                link: true,
                kanbanColumnId: true,
                kanbanOrder: true,
                mediaUsage: {
                  select: {
                    id: true,
                    order: true,
                    media: {
                      select: {
                        id: true,
                        url: true,
                        type: true,
                        mimeType: true,
                        width: true,
                        height: true,
                        duration: true,
                        thumbnail: true,
                        order: true,
                      },
                    },
                  },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { publishAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!calendar) {
      return { status: 'deleted' as const, calendar: null, permission: null };
    }

    return {
      status: 'valid' as const,
      calendar,
      permission: link.permission,
    };
  }

  /**
   * Get comments for a shared calendar (paginated).
   */
  async getComments(
    rawToken: string,
    cursor?: string,
    limit: number = 20,
    publicationId?: string,
  ) {
    const resolved = await this.shareLinkService.resolveToken(rawToken);
    this.assertValidLink(resolved);

    const { link } = resolved;

    const comments = await this.prisma.comment.findMany({
      where: {
        calendarId: link!.calendarId,
        isResolved: false,
        ...(publicationId && { publicationId }),
        ...(cursor && { createdAt: { lt: new Date(cursor) } }),
      },
      select: {
        id: true,
        publicationId: true,
        authorName: true,
        body: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to determine if there are more
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return {
      items: items.map((c) => ({
        ...c,
        isManager: !!c.userId,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Post a comment on a shared calendar.
   */
  async createComment(
    rawToken: string,
    dto: CreatePublicCommentDto,
    commenterId: string,
  ) {
    const resolved = await this.shareLinkService.resolveToken(rawToken);
    this.assertValidLink(resolved);

    const { link } = resolved;

    if (link!.permission !== SharePermission.VIEW_AND_COMMENT) {
      throw new ForbiddenException('This link does not allow commenting');
    }

    // If publicationId is provided, verify it belongs to this calendar
    if (dto.publicationId) {
      const publication = await this.prisma.publication.findFirst({
        where: {
          id: dto.publicationId,
          content: { calendarId: link!.calendarId },
        },
      });

      if (!publication) {
        throw new BadRequestException('Publication not found in this calendar');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        calendarId: link!.calendarId,
        publicationId: dto.publicationId,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        body: dto.body,
        shareLinkId: link!.id,
        commenterId,
      },
      select: {
        id: true,
        publicationId: true,
        authorName: true,
        body: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(
      `Comment created: ${comment.id} on calendar ${link!.calendarId} via link ${link!.id}`,
    );

    return comment;
  }

  /**
   * Edit own comment (within 15 min window).
   */
  async updateComment(
    rawToken: string,
    commentId: string,
    dto: UpdatePublicCommentDto,
    commenterId: string,
  ) {
    const resolved = await this.shareLinkService.resolveToken(rawToken);
    this.assertValidLink(resolved);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        calendarId: resolved.link!.calendarId,
        commenterId,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    this.assertWithinEditWindow(comment.createdAt);

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body },
      select: {
        id: true,
        publicationId: true,
        authorName: true,
        body: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete own comment (within 15 min window).
   */
  async deleteComment(
    rawToken: string,
    commentId: string,
    commenterId: string,
  ) {
    const resolved = await this.shareLinkService.resolveToken(rawToken);
    this.assertValidLink(resolved);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        calendarId: resolved.link!.calendarId,
        commenterId,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    this.assertWithinEditWindow(comment.createdAt);

    await this.prisma.comment.delete({ where: { id: commentId } });
    this.logger.log(`Comment deleted: ${commentId} by commenter`);
  }

  /**
   * Assert the resolved link is valid (not expired, not revoked).
   */
  private assertValidLink(resolved: { status: string; link: any }): void {
    switch (resolved.status) {
      case 'invalid':
        throw new NotFoundException(
          'Invalid link. Please check the URL and try again.',
        );
      case 'revoked':
        throw new GoneException(
          'This link is no longer active. Please contact the person who shared it with you.',
        );
      case 'expired':
        throw new GoneException(
          'This link has expired. Please contact the person who shared it with you for a new link.',
        );
    }
  }

  /**
   * Assert a comment is within the 15-minute edit window.
   */
  private assertWithinEditWindow(createdAt: Date): void {
    const elapsed = Date.now() - createdAt.getTime();
    if (elapsed > COMMENT_EDIT_WINDOW_MS) {
      throw new ForbiddenException(
        'Comments can only be edited or deleted within 15 minutes of creation',
      );
    }
  }
}
