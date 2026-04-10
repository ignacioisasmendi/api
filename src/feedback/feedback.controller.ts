import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, FeedbackUploadUrlDto } from './dto/feedback.dto';
import { GetUser, GetClientId } from '../decorators';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @GetUser() user: any,
    @GetClientId() clientId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(user.id, clientId || null, dto);
  }

  @Get()
  findAll(@GetUser() user: any, @Query() pagination: PaginationDto) {
    return this.feedbackService.findAllByUser(user.id, pagination);
  }

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  generateUploadUrl(@GetUser() user: any, @Body() dto: FeedbackUploadUrlDto) {
    return this.feedbackService.generateUploadUrl(user.id, dto);
  }
}
