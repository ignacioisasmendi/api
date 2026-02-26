import { Module } from '@nestjs/common';
import { KanbanColumnController } from './kanban-column.controller';
import { KanbanColumnService } from './kanban-column.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [KanbanColumnController],
  providers: [KanbanColumnService, PrismaService],
  exports: [KanbanColumnService],
})
export class KanbanColumnModule {}
