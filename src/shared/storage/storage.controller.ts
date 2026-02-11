import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { GenerateUploadUrlDto, UploadUrlResponseDto } from './dto/storage.dto';
import { GetUser } from '../../decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Generate a presigned URL for direct upload from client to R2
   * POST /storage/upload-url
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  async generateUploadUrl(
    @GetUser() user: User,
    @Body() dto: GenerateUploadUrlDto,
  ): Promise<UploadUrlResponseDto> {
    // Generate a unique key for this upload
    const timestamp = Date.now();
    const sanitizedFilename = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `users/${user.id}/uploads/${timestamp}_${sanitizedFilename}`;

    // Generate presigned URL
    const uploadUrl = await this.storageService.generateUploadUrl(
      key,
      dto.contentType,
      3600, // 1 hour expiration
    );

    // Get public URL
    const publicUrl = this.storageService.getPublicUrl(key);

    return {
      uploadUrl,
      key,
      publicUrl,
    };
  }
}
