import { Module } from '@nestjs/common';
import { TaskBoardController } from './task-board.controller';
import { TaskBoardService } from './task-board.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TaskBoardController],
  providers: [TaskBoardService, PrismaService],
  exports: [TaskBoardService],
})
export class TaskBoardModule {}
