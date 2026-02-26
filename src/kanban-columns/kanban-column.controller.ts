import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KanbanColumnService } from './kanban-column.service';
import {
  CreateKanbanColumnDto,
  UpdateKanbanColumnDto,
  ReorderColumnsDto,
} from './dto/kanban-column.dto';
import { GetClientId } from '../decorators/get-client-id.decorator';

@Controller('calendars/:calendarId/columns')
export class KanbanColumnController {
  constructor(private readonly kanbanColumnService: KanbanColumnService) {}

  @Get()
  listColumns(
    @Param('calendarId') calendarId: string,
    @GetClientId() clientId: string,
  ) {
    return this.kanbanColumnService.listColumns(calendarId, clientId);
  }

  @Post()
  createColumn(
    @Param('calendarId') calendarId: string,
    @GetClientId() clientId: string,
    @Body() dto: CreateKanbanColumnDto,
  ) {
    return this.kanbanColumnService.createColumn(calendarId, clientId, dto);
  }

  @Patch(':columnId')
  updateColumn(
    @Param('calendarId') calendarId: string,
    @Param('columnId') columnId: string,
    @GetClientId() clientId: string,
    @Body() dto: UpdateKanbanColumnDto,
  ) {
    return this.kanbanColumnService.updateColumn(
      calendarId,
      columnId,
      clientId,
      dto,
    );
  }

  @Delete(':columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteColumn(
    @Param('calendarId') calendarId: string,
    @Param('columnId') columnId: string,
    @GetClientId() clientId: string,
  ) {
    return this.kanbanColumnService.deleteColumn(
      calendarId,
      columnId,
      clientId,
    );
  }

  @Put('reorder')
  reorderColumns(
    @Param('calendarId') calendarId: string,
    @GetClientId() clientId: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.kanbanColumnService.reorderColumns(
      calendarId,
      clientId,
      dto.columnIds,
    );
  }
}
