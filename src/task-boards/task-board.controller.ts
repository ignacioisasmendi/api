import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TaskBoardService } from './task-board.service';
import { CreateTaskBoardDto, UpdateTaskBoardDto } from './dto/task-board.dto';
import { GetClientId } from '../decorators/get-client-id.decorator';

@Controller('task-boards')
export class TaskBoardController {
  constructor(private readonly taskBoardService: TaskBoardService) {}

  @Get()
  listBoards(@GetClientId() clientId: string) {
    return this.taskBoardService.listBoards(clientId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createBoard(
    @GetClientId() clientId: string,
    @Body() dto: CreateTaskBoardDto,
  ) {
    return this.taskBoardService.createBoard(clientId, dto);
  }

  @Patch(':boardId')
  updateBoard(
    @Param('boardId') boardId: string,
    @GetClientId() clientId: string,
    @Body() dto: UpdateTaskBoardDto,
  ) {
    return this.taskBoardService.updateBoard(boardId, clientId, dto);
  }

  @Delete(':boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBoard(
    @Param('boardId') boardId: string,
    @GetClientId() clientId: string,
  ) {
    return this.taskBoardService.deleteBoard(boardId, clientId);
  }
}
