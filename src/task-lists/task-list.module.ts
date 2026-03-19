import { Module } from '@nestjs/common';
import { TaskListController } from './task-list.controller';
import { TaskListService } from './task-list.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TaskListController],
  providers: [TaskListService, PrismaService],
  exports: [TaskListService],
})
export class TaskListModule {}
