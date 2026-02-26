import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateKanbanColumnDto,
  UpdateKanbanColumnDto,
} from './dto/kanban-column.dto';

@Injectable()
export class KanbanColumnService {
  private readonly logger = new Logger(KanbanColumnService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listColumns(calendarId: string, clientId: string) {
    await this.verifyCalendarOwnership(calendarId, clientId);

    return this.prisma.kanbanColumn.findMany({
      where: { calendarId },
      orderBy: { order: 'asc' },
    });
  }

  async createColumn(
    calendarId: string,
    clientId: string,
    dto: CreateKanbanColumnDto,
  ) {
    await this.verifyCalendarOwnership(calendarId, clientId);

    const maxOrder = await this.prisma.kanbanColumn.aggregate({
      where: { calendarId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const column = await this.prisma.kanbanColumn.create({
      data: {
        calendarId,
        name: dto.name,
        order: nextOrder,
        mappedStatus: dto.mappedStatus,
        color: dto.color,
      },
    });

    this.logger.log(`Column created: ${column.id} in calendar ${calendarId}`);
    return column;
  }

  async updateColumn(
    calendarId: string,
    columnId: string,
    clientId: string,
    dto: UpdateKanbanColumnDto,
  ) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId, calendar: { id: calendarId, clientId } },
    });

    if (!column) {
      throw new NotFoundException(`Column ${columnId} not found`);
    }

    return this.prisma.kanbanColumn.update({
      where: { id: columnId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.mappedStatus !== undefined && {
          mappedStatus: dto.mappedStatus,
        }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async deleteColumn(calendarId: string, columnId: string, clientId: string) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId, calendar: { id: calendarId, clientId } },
    });

    if (!column) {
      throw new NotFoundException(`Column ${columnId} not found`);
    }

    await this.prisma.kanbanColumn.delete({ where: { id: columnId } });
    this.logger.log(`Column deleted: ${columnId} from calendar ${calendarId}`);
  }

  async reorderColumns(
    calendarId: string,
    clientId: string,
    columnIds: string[],
  ) {
    await this.verifyCalendarOwnership(calendarId, clientId);

    // Verify all columns belong to this calendar
    const existingColumns = await this.prisma.kanbanColumn.findMany({
      where: { calendarId },
      select: { id: true },
    });

    const existingIds = new Set(existingColumns.map((c) => c.id));
    for (const id of columnIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Column ${id} does not belong to calendar ${calendarId}`,
        );
      }
    }

    // Batch update order in a transaction
    await this.prisma.$transaction(
      columnIds.map((id, index) =>
        this.prisma.kanbanColumn.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.prisma.kanbanColumn.findMany({
      where: { calendarId },
      orderBy: { order: 'asc' },
    });
  }

  private async verifyCalendarOwnership(calendarId: string, clientId: string) {
    const calendar = await this.prisma.calendar.findFirst({
      where: { id: calendarId, clientId },
    });

    if (!calendar) {
      throw new NotFoundException(`Calendar ${calendarId} not found`);
    }
  }
}
