import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { PublicShareService } from './public-share.service';
import {
  CreatePublicCommentDto,
  UpdatePublicCommentDto,
} from './dto/public-comment.dto';
import { IsPublic } from '../decorators/public.decorator';
import { randomBytes } from 'crypto';

const COMMENTER_COOKIE = 'planer_commenter_id';
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days

@Controller('shared')
@UseGuards(ThrottlerGuard)
export class PublicShareController {
  constructor(private readonly publicShareService: PublicShareService) {}

  /**
   * Get shared calendar view (validates token, checks expiry)
   * GET /shared/:token
   * Rate limit: 60 req/min per IP
   */
  @IsPublic()
  @Throttle({ short: { ttl: 60000, limit: 60 } })
  @Get(':token')
  async getSharedCalendar(@Param('token') token: string) {
    return this.publicShareService.getSharedCalendar(token);
  }

  /**
   * Get comments for shared calendar (paginated)
   * GET /shared/:token/comments
   */
  @IsPublic()
  @Get(':token/comments')
  async getComments(
    @Param('token') token: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('publicationId') publicationId?: string,
  ) {
    return this.publicShareService.getComments(
      token,
      cursor,
      limit ? parseInt(limit, 10) : 20,
      publicationId,
    );
  }

  /**
   * Post a comment on the shared calendar
   * POST /shared/:token/comments
   * Rate limit: 10 req/min per IP (stricter for writes)
   */
  @IsPublic()
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @Post(':token/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('token') token: string,
    @Body() dto: CreatePublicCommentDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const commenterId = this.getOrCreateCommenterId(req, res);
    return this.publicShareService.createComment(token, dto, commenterId);
  }

  /**
   * Edit own comment (within 15 min)
   * PATCH /shared/:token/comments/:commentId
   * Rate limit: 10 req/min per IP
   */
  @IsPublic()
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @Patch(':token/comments/:commentId')
  async updateComment(
    @Param('token') token: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdatePublicCommentDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const commenterId = this.getOrCreateCommenterId(req, res);
    return this.publicShareService.updateComment(
      token,
      commentId,
      dto,
      commenterId,
    );
  }

  /**
   * Delete own comment (within 15 min)
   * DELETE /shared/:token/comments/:commentId
   */
  @IsPublic()
  @Delete(':token/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Param('token') token: string,
    @Param('commentId') commentId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const commenterId = this.getOrCreateCommenterId(req, res);
    await this.publicShareService.deleteComment(token, commentId, commenterId);
  }

  /**
   * Get or create a commenter ID from cookie.
   * This identifies the browser session for edit/delete ownership.
   */
  private getOrCreateCommenterId(req: Request, res: Response): string {
    let commenterId = req.cookies?.[COMMENTER_COOKIE];

    if (!commenterId) {
      commenterId = randomBytes(16).toString('hex');
      res.cookie(COMMENTER_COOKIE, commenterId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return commenterId;
  }
}
