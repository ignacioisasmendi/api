import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskBoardDto, UpdateTaskBoardDto } from './dto/task-board.dto';

@Injectable()
export class TaskBoardService {
  private readonly logger = new Logger(TaskBoardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listBoards(clientId: string) {
    return this.prisma.taskBoard.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { lists: true } } },
    });
  }

  async createBoard(clientId: string, dto: CreateTaskBoardDto) {
    const board = await this.prisma.taskBoard.create({
      data: {
        clientId,
        name: dto.name,
        color: dto.color,
      },
      include: { _count: { select: { lists: true } } },
    });

    this.logger.log(`Board created: ${board.id} for client ${clientId}`);
    return board;
  }

  async updateBoard(
    boardId: string,
    clientId: string,
    dto: UpdateTaskBoardDto,
  ) {
    const board = await this.prisma.taskBoard.findFirst({
      where: { id: boardId, clientId },
    });

    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    return this.prisma.taskBoard.update({
      where: { id: boardId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: { _count: { select: { lists: true } } },
    });
  }

  async deleteBoard(boardId: string, clientId: string) {
    const board = await this.prisma.taskBoard.findFirst({
      where: { id: boardId, clientId },
    });

    if (!board) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }

    await this.prisma.taskBoard.delete({ where: { id: boardId } });
    this.logger.log(`Board deleted: ${boardId}`);
  }
}
