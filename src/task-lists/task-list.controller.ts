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
import { TaskListService } from './task-list.service';
import {
  CreateTaskListDto,
  UpdateTaskListDto,
  ReorderTaskListsDto,
} from './dto/task-list.dto';
import { GetClientId } from '../decorators/get-client-id.decorator';

@Controller('task-boards/:boardId/lists')
export class TaskListController {
  constructor(private readonly taskListService: TaskListService) {}

  @Get()
  listLists(
    @Param('boardId') boardId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskListService.listLists(boardId, clientId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createList(
    @Param('boardId') boardId: string,
    @GetClientId() clientId: string,
    @Body() dto: CreateTaskListDto,
  ) {
    return this.taskListService.createList(boardId, clientId, dto);
  }

  @Patch(':listId')
  updateList(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @GetClientId() clientId: string,
    @Body() dto: UpdateTaskListDto,
  ) {
    return this.taskListService.updateList(boardId, listId, clientId, dto);
  }

  @Delete(':listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteList(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskListService.deleteList(boardId, listId, clientId);
  }

  @Put('reorder')
  reorderLists(
    @Param('boardId') boardId: string,
    @GetClientId() clientId: string,
    @Body() dto: ReorderTaskListsDto,
  ) {
    return this.taskListService.reorderLists(boardId, clientId, dto.listIds);
  }
}
