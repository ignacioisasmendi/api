import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateManagerCommentDto } from './dto/comment.dto';
import { GetUser } from '../decorators/get-user.decorator';
import { User } from '@prisma/client';
import { GetClientId } from 'src/decorators';

@Controller('calendars/:calendarId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  /**
   * List all comments for a calendar (manager view)
   * GET /calendars/:calendarId/comments
   */
  @Get()
  async list(
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
  ) {
    return this.commentService.listComments(calendarId, clientId);
  }

  /**
   * Manager posts a reply/comment
   * POST /calendars/:calendarId/comments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: User,
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
    @Body() dto: CreateManagerCommentDto,
  ) {
    return this.commentService.createManagerComment(
      calendarId,
      clientId,
      user.id,
      user.name || 'Manager',
      dto,
    );
  }

  /**
   * Resolve a comment (hide from client view)
   * PATCH /calendars/:calendarId/comments/:commentId/resolve
   */
  @Patch(':commentId/resolve')
  async resolve(
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentService.resolveComment(calendarId, commentId, clientId);
  }

  /**
   * Delete a comment permanently
   * DELETE /calendars/:calendarId/comments/:commentId
   */
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
    @Param('commentId') commentId: string,
  ) {
    await this.commentService.deleteComment(calendarId, commentId, clientId);
  }
}
