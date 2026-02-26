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
import {
  CreateContentDto,
  UpdateContentDto,
  AddMediaToContentDto,
} from './dto/content.dto';
import { GetUser } from '../decorators/get-user.decorator';
import { User } from '@prisma/client';
import { GetClientId } from 'src/decorators';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * Create new content with media
   * POST /content
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: User,
    @GetClientId() clientId: string,
    @Body() dto: CreateContentDto,
  ) {
    return this.contentService.createContent(dto, user.id, clientId);
  }

  /**
   * Get all content for the authenticated client
   * GET /content
   */
  @Get()
  async list(@GetClientId() clientId: string) {
    return this.contentService.listContent(clientId);
  }

  /**
   * Get specific content by ID
   * GET /content/:id
   */
  @Get(':id')
  async get(@GetClientId() clientId: string, @Param('id') id: string) {
    return this.contentService.getContent(id, clientId);
  }

  /**
   * Update content caption
   * PATCH /content/:id
   */
  @Patch(':id')
  async update(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.updateContent(id, clientId, dto);
  }

  /**
   * Add more media to existing content
   * POST /content/:id/media
   */
  @Post(':id/media')
  @HttpCode(HttpStatus.OK)
  async addMedia(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Body() dto: AddMediaToContentDto,
  ) {
    return this.contentService.addMedia(id, clientId, dto);
  }

  /**
   * Delete content
   * DELETE /content/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@GetClientId() clientId: string, @Param('id') id: string) {
    await this.contentService.deleteContent(id, clientId);
  }

  /**
   * Delete specific media from content
   * DELETE /content/media/:mediaId
   */
  @Delete('media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(
    @GetClientId() clientId: string,
    @Param('mediaId') mediaId: string,
  ) {
    await this.contentService.deleteMedia(mediaId, clientId);
  }
}
