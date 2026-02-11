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
import { ContentService } from './content.service';
import { CreateContentDto, UpdateContentDto, AddMediaToContentDto } from './dto/content.dto';
import { GetUser } from '../decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * Create new content with media
   * POST /content
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@GetUser() user: User, @Body() dto: CreateContentDto) {
    return this.contentService.createContent(dto, user.id);
  }

  /**
   * Get all content for the authenticated user
   * GET /content
   */
  @Get()
  async list(@GetUser() user: User) {
    return this.contentService.listContent(user.id);
  }

  /**
   * Get specific content by ID
   * GET /content/:id
   */
  @Get(':id')
  async get(@GetUser() user: User, @Param('id') id: string) {
    return this.contentService.getContent(id, user.id);
  }

  /**
   * Update content caption
   * PATCH /content/:id
   */
  @Patch(':id')
  async update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.updateContent(id, user.id, dto);
  }

  /**
   * Add more media to existing content
   * POST /content/:id/media
   */
  @Post(':id/media')
  @HttpCode(HttpStatus.OK)
  async addMedia(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddMediaToContentDto,
  ) {
    return this.contentService.addMedia(id, user.id, dto);
  }

  /**
   * Delete content
   * DELETE /content/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@GetUser() user: User, @Param('id') id: string) {
    await this.contentService.deleteContent(id, user.id);
  }

  /**
   * Delete specific media from content
   * DELETE /content/media/:mediaId
   */
  @Delete('media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(@GetUser() user: User, @Param('mediaId') mediaId: string) {
    await this.contentService.deleteMedia(mediaId, user.id);
  }
}
