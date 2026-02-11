import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { CreatePostDto, SchedulePostDto } from './instagram.dto';
import { GetUser } from '../decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publishPost(@Body() createPostDto: CreatePostDto) {
    return this.instagramService.publishPost(createPostDto);
  }

  @Post('schedule')
  @HttpCode(HttpStatus.CREATED)
  async schedulePost(
    @GetUser() user: User,
    @Body() schedulePostDto: SchedulePostDto,
  ) {
    return this.instagramService.schedulePost(
      schedulePostDto,
      user.id,
      schedulePostDto.socialAccountId,
    );
  }
}
