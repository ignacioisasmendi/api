import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskListDto, UpdateTaskListDto } from './dto/task-list.dto';

@Injectable()
export class TaskListService {
  private readonly logger = new Logger(TaskListService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listLists(boardId: string, clientId: string) {
    await this.verifyBoardOwnership(boardId, clientId);

    return this.prisma.taskList.findMany({
      where: { taskBoardId: boardId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async createList(boardId: string, clientId: string, dto: CreateTaskListDto) {
    await this.verifyBoardOwnership(boardId, clientId);

    const maxOrder = await this.prisma.taskList.aggregate({
      where: { taskBoardId: boardId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const list = await this.prisma.taskList.create({
      data: {
        taskBoardId: boardId,
        name: dto.name,
        order: nextOrder,
      },
      include: { _count: { select: { tasks: true } } },
    });

    this.logger.log(`List created: ${list.id} in board ${boardId}`);
    return list;
  }

  async updateList(
    boardId: string,
    listId: string,
    clientId: string,
    dto: UpdateTaskListDto,
  ) {
    const list = await this.prisma.taskList.findFirst({
      where: { id: listId, taskBoard: { id: boardId, clientId } },
    });

    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }

    return this.prisma.taskList.update({
      where: { id: listId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async deleteList(boardId: string, listId: string, clientId: string) {
    const list = await this.prisma.taskList.findFirst({
      where: { id: listId, taskBoard: { id: boardId, clientId } },
    });

    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }

    await this.prisma.taskList.delete({ where: { id: listId } });
    this.logger.log(`List deleted: ${listId} from board ${boardId}`);
  }

  async reorderLists(boardId: string, clientId: string, listIds: string[]) {
    await this.verifyBoardOwnership(boardId, clientId);

    const existingLists = await this.prisma.taskList.findMany({
      where: { taskBoardId: boardId },
      select: { id: true },
    });

    const existingIds = new Set(existingLists.map((l) => l.id));
    for (const id of listIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `List ${id} does not belong to board ${boardId}`,
        );
      }
    }

    await this.prisma.$transaction(
      listIds.map((id, index) =>
        this.prisma.taskList.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.prisma.taskList.findMany({
      where: { taskBoardId: boardId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  private async verifyBoardOwnership(boardId: string, clientId: string) {
    const board = await this.prisma.taskBoard.findFirst({
      where: { id: boardId, clientId },
    });

    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }
  }
}
