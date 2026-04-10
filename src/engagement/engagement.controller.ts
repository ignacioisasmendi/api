import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { ReplyDto } from './dto/engagement.dto';
import { GetClientId, IsPublic } from '../decorators';
import { RequireFeature } from '../plans/decorators/require-feature.decorator';

@Controller('engagement')
@RequireFeature('engagement')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  /**
   * GET /engagement/comments?accountId=xxx
   * Returns recent media with their Instagram comments.
   */
  @Get('comments')
  getComments(
    @GetClientId() clientId: string,
    @Query('accountId') accountId: string,
  ) {
    return this.engagementService.getComments(accountId, clientId);
  }

  /**
   * GET /engagement/token-debug?accountId=xxx
   * Returns the scopes granted to the stored Instagram token.
   */
  @IsPublic()
  @Get('token-debug')
  tokenDebug(
    @GetClientId() clientId: string,
    @Query('accountId') accountId: string,
  ) {
    return this.engagementService.debugToken(
      accountId,
      'cmljwyf560001fdcoco2mnle3',
    );
  }

  /**
   * POST /engagement/comments/:commentId/reply
   * Posts a reply to an Instagram comment.
   */
  @Post('comments/:commentId/reply')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reply(
    @GetClientId() clientId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ReplyDto,
  ) {
    await this.engagementService.replyToComment(
      commentId,
      dto.accountId,
      clientId,
      dto.message,
    );
  }
}
