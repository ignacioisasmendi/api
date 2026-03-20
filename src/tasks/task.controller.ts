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
import { TaskService } from './task.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  ReorderTasksDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  AddTaskDependencyDto,
} from './dto/task.dto';
import { GetClientId } from '../decorators/get-client-id.decorator';

@Controller('task-boards/:boardId')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('tasks')
  listAllBoardTasks(
    @Param('boardId') boardId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskService.listAllBoardTasks(boardId, clientId);
  }

  @Get('lists/:listId/tasks')
  listTasks(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskService.listTasks(boardId, listId, clientId);
  }

  @Get('lists/:listId/tasks/:taskId')
  getTask(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskService.getTask(boardId, listId, taskId, clientId);
  }

  @Post('lists/:listId/tasks')
  @HttpCode(HttpStatus.CREATED)
  createTask(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @GetClientId() clientId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.createTask(boardId, listId, clientId, dto);
  }

  @Patch('lists/:listId/tasks/:taskId')
  updateTask(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @GetClientId() clientId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(boardId, listId, taskId, clientId, dto);
  }

  @Delete('lists/:listId/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskService.deleteTask(boardId, listId, taskId, clientId);
  }

  @Patch('lists/:listId/tasks/:taskId/move')
  moveTask(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @GetClientId() clientId: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.taskService.moveTask(boardId, listId, taskId, clientId, dto);
  }

  @Put('lists/:listId/tasks/reorder')
  reorderTasks(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @GetClientId() clientId: string,
    @Body() dto: ReorderTasksDto,
  ) {
    return this.taskService.reorderTasks(
      boardId,
      listId,
      clientId,
      dto.taskIds,
    );
  }

  // --- Checklist ---

  @Post('lists/:listId/tasks/:taskId/checklist')
  @HttpCode(HttpStatus.CREATED)
  createChecklistItem(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @GetClientId() clientId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.taskService.createChecklistItem(
      boardId,
      listId,
      taskId,
      clientId,
      dto,
    );
  }

  @Patch('lists/:listId/tasks/:taskId/checklist/:itemId')
  updateChecklistItem(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @GetClientId() clientId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.taskService.updateChecklistItem(
      boardId,
      listId,
      taskId,
      itemId,
      clientId,
      dto,
    );
  }

  @Delete('lists/:listId/tasks/:taskId/checklist/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteChecklistItem(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskService.deleteChecklistItem(
      boardId,
      listId,
      taskId,
      itemId,
      clientId,
    );
  }

  // --- Dependencies ---

  @Post('lists/:listId/tasks/:taskId/dependencies')
  @HttpCode(HttpStatus.CREATED)
  addDependency(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @GetClientId() clientId: string,
    @Body() dto: AddTaskDependencyDto,
  ) {
    return this.taskService.addDependency(
      boardId,
      listId,
      taskId,
      clientId,
      dto,
    );
  }

  @Delete('lists/:listId/tasks/:taskId/dependencies/:blockedById')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDependency(
    @Param('boardId') boardId: string,
    @Param('listId') listId: string,
    @Param('taskId') taskId: string,
    @Param('blockedById') blockedById: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskService.removeDependency(
      boardId,
      listId,
      taskId,
      blockedById,
      clientId,
    );
  }
}
