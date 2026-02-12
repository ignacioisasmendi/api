import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarDto, UpdateCalendarDto } from './dto/calendar.dto';
import { Prisma } from '@prisma/client';

type CalendarWithRelations = Prisma.CalendarGetPayload<{
  include: {
    contents: {
      include: {
        media: true;
        publications: {
          include: {
            socialAccount: true;
            mediaUsage: { include: { media: true } };
          };
        };
      };
    };
    _count: { select: { shareLinks: true; comments: true } };
  };
}>;

type CalendarBasic = Prisma.CalendarGetPayload<{
  include: {
    _count: {
      select: { contents: true; shareLinks: true; comments: true };
    };
  };
}>;

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCalendar(
    dto: CreateCalendarDto,
    userId: string,
    clientId: string,
  ): Promise<CalendarBasic> {
    const calendar = await this.prisma.calendar.create({
      data: {
        userId,
        clientId,
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: {
          select: { contents: true, shareLinks: true, comments: true },
        },
      },
    });

    this.logger.log(`Calendar created: ${calendar.id} by user ${userId} for client ${clientId}`);
    return calendar;
  }

  async listCalendars(clientId: string): Promise<CalendarBasic[]> {
    return this.prisma.calendar.findMany({
      where: { clientId },
      include: {
        _count: {
          select: { contents: true, shareLinks: true, comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCalendar(
    id: string,
    clientId: string,
  ): Promise<CalendarWithRelations> {
    const calendar = await this.prisma.calendar.findFirst({
      where: { id, clientId },
      include: {
        contents: {
          include: {
            media: { orderBy: { order: 'asc' } },
            publications: {
              include: {
                socialAccount: true,
                mediaUsage: {
                  include: { media: true },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { publishAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { shareLinks: true, comments: true } },
      },
    });

    if (!calendar) {
      throw new NotFoundException(`Calendar ${id} not found`);
    }

    return calendar;
  }

  async updateCalendar(
    id: string,
    clientId: string,
    dto: UpdateCalendarDto,
  ): Promise<CalendarBasic> {
    await this.verifyOwnership(id, clientId);

    return this.prisma.calendar.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        _count: {
          select: { contents: true, shareLinks: true, comments: true },
        },
      },
    });
  }

  async deleteCalendar(id: string, clientId: string): Promise<void> {
    await this.verifyOwnership(id, clientId);

    await this.prisma.calendar.delete({ where: { id } });
    this.logger.log(`Calendar deleted: ${id} for client ${clientId}`);
  }

  async assignContent(
    calendarId: string,
    contentId: string,
    clientId: string,
  ): Promise<void> {
    await this.verifyOwnership(calendarId, clientId);

    // Verify content belongs to the same client
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, clientId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: { calendarId },
    });

    this.logger.log(
      `Content ${contentId} assigned to calendar ${calendarId}`,
    );
  }

  async unassignContent(
    calendarId: string,
    contentId: string,
    clientId: string,
  ): Promise<void> {
    await this.verifyOwnership(calendarId, clientId);

    const content = await this.prisma.content.findFirst({
      where: { id: contentId, clientId, calendarId },
    });

    if (!content) {
      throw new NotFoundException(
        `Content ${contentId} not found in calendar ${calendarId}`,
      );
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: { calendarId: null },
    });

    this.logger.log(
      `Content ${contentId} removed from calendar ${calendarId}`,
    );
  }

  private async verifyOwnership(
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
