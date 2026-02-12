import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CalendarController, CommentController],
  providers: [CalendarService, CommentService, PrismaService],
  exports: [CalendarService, CommentService],
})
export class CalendarModule {}
