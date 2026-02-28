import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { GetClientId } from '../decorators/get-client-id.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Upload a file to a content's media library
   * POST /contents/:contentId/media
   */
  @Post('contents/:contentId/media')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB absolute max
    }),
  )
  async upload(
    @Param('contentId') contentId: string,
    @GetClientId() clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('order') order?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const parsedOrder =
      order !== undefined ? parseInt(order, 10) : undefined;
    return this.mediaService.uploadMedia(contentId, clientId, file, parsedOrder);
  }

  /**
   * List all media for the active client with signed URLs
   * GET /media
   */
  @Get('media')
  async listClient(
    @GetClientId() clientId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.mediaService.listClientMedia(clientId, pagination);
  }

  /**
   * List all media for a content with signed URLs
   * GET /contents/:contentId/media
   */
  @Get('contents/:contentId/media')
  async list(
    @Param('contentId') contentId: string,
    @GetClientId() clientId: string,
  ) {
    return this.mediaService.listMedia(contentId, clientId);
  }

  /**
   * Delete a media file from R2 and DB
   * DELETE /media/:mediaId
   */
  @Delete('media/:mediaId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('mediaId') mediaId: string,
    @GetClientId() clientId: string,
  ) {
    return this.mediaService.deleteMedia(mediaId, clientId);
  }

  /**
   * Reorder media within a content (carousel order)
   * PATCH /contents/:contentId/media/reorder
   */
  @Patch('contents/:contentId/media/reorder')
  async reorder(
    @Param('contentId') contentId: string,
    @GetClientId() clientId: string,
    @Body() dto: ReorderMediaDto,
  ) {
    return this.mediaService.reorderMedia(contentId, clientId, dto);
  }
}
