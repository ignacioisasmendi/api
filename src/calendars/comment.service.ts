import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManagerCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all comments for a calendar (manager view, includes resolved).
   */
  async listComments(calendarId: string, clientId: string) {
    await this.verifyCalendarOwnership(calendarId, clientId);

    return this.prisma.comment.findMany({
      where: { calendarId },
      select: {
        id: true,
        publicationId: true,
        authorName: true,
        authorEmail: true,
        body: true,
        shareLinkId: true,
        userId: true,
        isResolved: true,
        createdAt: true,
        updatedAt: true,
        shareLink: {
          select: { label: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Manager posts a reply/comment on their own calendar.
   */
  async createManagerComment(
    calendarId: string,
    clientId: string,
    userId: string,
    userName: string,
    dto: CreateManagerCommentDto,
  ) {
    await this.verifyCalendarOwnership(calendarId, clientId);

    const comment = await this.prisma.comment.create({
      data: {
        calendarId,
        publicationId: dto.publicationId,
        authorName: userName || 'Manager',
        body: dto.body,
        userId,
      },
      select: {
        id: true,
        publicationId: true,
        authorName: true,
        body: true,
        userId: true,
        isResolved: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(
      `Manager comment created: ${comment.id} on calendar ${calendarId} by user ${userId}`,
    );

    return comment;
  }

  /**
   * Resolve a comment (hide from client view, keep for audit).
   */
  async resolveComment(
    calendarId: string,
    commentId: string,
    clientId: string,
  ) {
    await this.verifyCalendarOwnership(calendarId, clientId);

    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, calendarId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { isResolved: true },
      select: {
        id: true,
        isResolved: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete a comment permanently.
   */
  async deleteComment(
    calendarId: string,
    commentId: string,
    clientId: string,
  ) {
    await this.verifyCalendarOwnership(calendarId, clientId);

    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, calendarId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    this.logger.log(
      `Comment deleted: ${commentId} on calendar ${calendarId}`,
    );
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
