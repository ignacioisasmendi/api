import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  AddTaskDependencyDto,
} from './dto/task.dto';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listAllBoardTasks(boardId: string, clientId: string) {
    const board = await this.prisma.taskBoard.findFirst({
      where: { id: boardId, clientId },
    });

    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    const tasks = await this.prisma.task.findMany({
      where: { taskList: { taskBoardId: boardId } },
      orderBy: { order: 'asc' },
      include: {
        checklist: { select: { id: true, done: true } },
        _count: { select: { blockedBy: true } },
      },
    });

    // Group by listId
    const grouped: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (!grouped[task.taskListId]) grouped[task.taskListId] = [];
      grouped[task.taskListId].push(task);
    }
    return grouped;
  }

  async getTask(
    boardId: string,
    listId: string,
    taskId: string,
    clientId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        taskList: { id: listId, taskBoard: { id: boardId, clientId } },
      },
      include: {
        checklist: { orderBy: { order: 'asc' } },
        blockedBy: {
          include: {
            blockedBy: {
              select: { id: true, title: true, taskListId: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return task;
  }

  async listTasks(boardId: string, listId: string, clientId: string) {
    await this.verifyListOwnership(listId, boardId, clientId);

    return this.prisma.task.findMany({
      where: { taskListId: listId },
      orderBy: { order: 'asc' },
    });
  }

  async createTask(
    boardId: string,
    listId: string,
    clientId: string,
    dto: CreateTaskDto,
  ) {
    await this.verifyListOwnership(listId, boardId, clientId);

    const maxOrder = await this.prisma.task.aggregate({
      where: { taskListId: listId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const task = await this.prisma.task.create({
      data: {
        taskListId: listId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        labels: dto.labels ?? [],
        coverColor: dto.coverColor,
        order: nextOrder,
      },
    });

    this.logger.log(`Task created: ${task.id} in list ${listId}`);
    return task;
  }

  async updateTask(
    boardId: string,
    listId: string,
    taskId: string,
    clientId: string,
    dto: UpdateTaskDto,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        taskList: { id: listId, taskBoard: { id: boardId, clientId } },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...('priority' in dto && { priority: dto.priority }),
        ...('dueDate' in dto && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.labels !== undefined && { labels: dto.labels }),
        ...('coverColor' in dto && { coverColor: dto.coverColor }),
        ...(dto.done !== undefined && { done: dto.done }),
      },
    });
  }

  async deleteTask(
    boardId: string,
    listId: string,
    taskId: string,
    clientId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        taskList: { id: listId, taskBoard: { id: boardId, clientId } },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    await this.prisma.task.delete({ where: { id: taskId } });
    this.logger.log(`Task deleted: ${taskId}`);
  }

  async moveTask(
    boardId: string,
    listId: string,
    taskId: string,
    clientId: string,
    dto: MoveTaskDto,
  ) {
    // Verify source task exists and belongs to this client
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        taskList: { id: listId, taskBoard: { id: boardId, clientId } },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Verify destination list belongs to same board/client
    const destList = await this.prisma.taskList.findFirst({
      where: { id: dto.listId, taskBoard: { id: boardId, clientId } },
    });

    if (!destList) {
      throw new NotFoundException(`Destination list ${dto.listId} not found`);
    }

    // Move and reorder in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Shift tasks in destination list to make room
      await tx.task.updateMany({
        where: {
          taskListId: dto.listId,
          order: { gte: dto.order },
          id: { not: taskId },
        },
        data: { order: { increment: 1 } },
      });

      // Update the task
      await tx.task.update({
        where: { id: taskId },
        data: { taskListId: dto.listId, order: dto.order },
      });
    });

    return this.prisma.task.findUnique({ where: { id: taskId } });
  }

  async reorderTasks(
    boardId: string,
    listId: string,
    clientId: string,
    taskIds: string[],
  ) {
    await this.verifyListOwnership(listId, boardId, clientId);

    const existingTasks = await this.prisma.task.findMany({
      where: { taskListId: listId },
      select: { id: true },
    });

    const existingIds = new Set(existingTasks.map((t) => t.id));
    for (const id of taskIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Task ${id} does not belong to list ${listId}`,
        );
      }
    }

    await this.prisma.$transaction(
      taskIds.map((id, index) =>
        this.prisma.task.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.prisma.task.findMany({
      where: { taskListId: listId },
      orderBy: { order: 'asc' },
    });
  }

  // --- Checklist ---

  async createChecklistItem(
    boardId: string,
    listId: string,
    taskId: string,
    clientId: string,
    dto: CreateChecklistItemDto,
  ) {
    await this.verifyTaskOwnership(taskId, listId, boardId, clientId);

    const maxOrder = await this.prisma.checklistItem.aggregate({
      where: { taskId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    return this.prisma.checklistItem.create({
      data: { taskId, title: dto.title, order: nextOrder },
    });
  }

  async updateChecklistItem(
    boardId: string,
    listId: string,
    taskId: string,
    itemId: string,
    clientId: string,
    dto: UpdateChecklistItemDto,
  ) {
    await this.verifyTaskOwnership(taskId, listId, boardId, clientId);

    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, taskId },
    });
    if (!item) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.done !== undefined && { done: dto.done }),
      },
    });
  }

  async deleteChecklistItem(
    boardId: string,
    listId: string,
    taskId: string,
    itemId: string,
    clientId: string,
  ) {
    await this.verifyTaskOwnership(taskId, listId, boardId, clientId);

    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, taskId },
    });
    if (!item) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }

    await this.prisma.checklistItem.delete({ where: { id: itemId } });
  }

  // --- Dependencies ---

  async addDependency(
    boardId: string,
    listId: string,
    taskId: string,
    clientId: string,
    dto: AddTaskDependencyDto,
  ) {
    await this.verifyTaskOwnership(taskId, listId, boardId, clientId);

    if (dto.blockedById === taskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const blocker = await this.prisma.task.findFirst({
      where: {
        id: dto.blockedById,
        taskList: { taskBoard: { id: boardId, clientId } },
      },
    });
    if (!blocker) {
      throw new NotFoundException(`Task ${dto.blockedById} not found`);
    }

    return this.prisma.taskDependency.upsert({
      where: {
        taskId_blockedById: { taskId, blockedById: dto.blockedById },
      },
      create: { taskId, blockedById: dto.blockedById },
      update: {},
    });
  }

  async removeDependency(
    boardId: string,
    listId: string,
    taskId: string,
    blockedById: string,
    clientId: string,
  ) {
    await this.verifyTaskOwnership(taskId, listId, boardId, clientId);

    await this.prisma.taskDependency.deleteMany({
      where: { taskId, blockedById },
    });
  }

  private async verifyListOwnership(
    listId: string,
    boardId: string,
    clientId: string,
  ) {
    const list = await this.prisma.taskList.findFirst({
      where: { id: listId, taskBoard: { id: boardId, clientId } },
    });

    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }
  }

  private async verifyTaskOwnership(
    taskId: string,
    listId: string,
    boardId: string,
    clientId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        taskList: { id: listId, taskBoard: { id: boardId, clientId } },
      },
    });
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return task;
  }
}
