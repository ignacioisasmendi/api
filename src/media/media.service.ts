import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaType } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../shared/storage/storage.service';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { MediaResponseDto } from './dto/media-response.dto';
import {
  PaginationDto,
  PaginatedResponse,
} from '../common/dto/pagination.dto';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/mpeg',
]);

const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/webm': 'webm',
  'video/mpeg': 'mpeg',
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxMediaPerContent: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    this.maxMediaPerContent = this.config.get<number>(
      'MAX_MEDIA_PER_CONTENT',
      10,
    );
  }

  async uploadMedia(
    contentId: string,
    clientId: string,
    file: Express.Multer.File,
    order?: number,
  ): Promise<MediaResponseDto> {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, clientId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    const mimeType = file.mimetype;
    const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);

    if (!isImage && !isVideo) {
      throw new BadRequestException(`Unsupported file type: ${mimeType}`);
    }

    if (isImage && file.size > IMAGE_SIZE_LIMIT) {
      throw new BadRequestException('Image exceeds 10MB limit');
    }
    if (isVideo && file.size > VIDEO_SIZE_LIMIT) {
      throw new BadRequestException('Video exceeds 100MB limit');
    }

    const mediaCount = await this.prisma.media.count({
      where: { contentId },
    });
    if (mediaCount >= this.maxMediaPerContent) {
      throw new BadRequestException(
        `Content already has the maximum of ${this.maxMediaPerContent} media files`,
      );
    }

    const ext = MIME_TO_EXT[mimeType] ?? 'bin';
    const key = `clients/${clientId}/contents/${contentId}/${crypto.randomUUID()}.${ext}`;

    const url = await this.storage.uploadFile(key, file.buffer, mimeType);

    const type: MediaType = isImage ? MediaType.IMAGE : MediaType.VIDEO;
    const nextOrder =
      order !== undefined ? order : await this.getNextOrder(contentId);

    const media = await this.prisma.media.create({
      data: {
        contentId,
        url,
        key,
        type,
        mimeType,
        size: file.size,
        order: nextOrder,
      },
    });

    this.logger.log(`Uploaded media ${media.id} for content ${contentId}`);

    const signedUrl = await this.storage.getSignedUrl(key);
    return { ...media, signedUrl };
  }

  async listMedia(
    contentId: string,
    clientId: string,
  ): Promise<MediaResponseDto[]> {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, clientId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    const mediaList = await this.prisma.media.findMany({
      where: { contentId },
      orderBy: { order: 'asc' },
    });

    return Promise.all(
      mediaList.map(async (m) => ({
        ...m,
        signedUrl: await this.storage.getSignedUrl(m.key),
      })),
    );
  }

  async deleteMedia(
    mediaId: string,
    clientId: string,
  ): Promise<{ success: true }> {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, content: { clientId } },
      include: { publicationUsage: { select: { id: true } } },
    });

    if (!media) {
      throw new NotFoundException(`Media ${mediaId} not found`);
    }

    if (media.publicationUsage.length > 0) {
      throw new BadRequestException(
        'Cannot delete media that is used in publications',
      );
    }

    await this.storage.deleteFile(media.key);
    await this.prisma.media.delete({ where: { id: mediaId } });

    this.logger.log(`Deleted media ${mediaId}`);
    return { success: true };
  }

  async reorderMedia(
    contentId: string,
    clientId: string,
    dto: ReorderMediaDto,
  ): Promise<MediaResponseDto[]> {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, clientId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    const existingMedia = await this.prisma.media.findMany({
      where: { contentId },
      select: { id: true },
    });

    const existingIds = new Set(existingMedia.map((m) => m.id));

    for (const id of dto.mediaIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Media ${id} does not belong to content ${contentId}`,
        );
      }
    }

    if (dto.mediaIds.length !== existingIds.size) {
      throw new BadRequestException(
        'mediaIds must include all media for this content',
      );
    }

    await this.prisma.$transaction(
      dto.mediaIds.map((id, index) =>
        this.prisma.media.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.listMedia(contentId, clientId);
  }

  async listClientMedia(
    clientId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<MediaResponseDto>> {
    const [total, mediaList] = await this.prisma.$transaction([
      this.prisma.media.count({
        where: { content: { clientId } },
      }),
      this.prisma.media.findMany({
        where: { content: { clientId } },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    const data = await Promise.all(
      mediaList.map(async (m) => ({
        ...m,
        signedUrl: await this.storage.getSignedUrl(m.key),
      })),
    );

    return {
      data,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  private async getNextOrder(contentId: string): Promise<number> {
    const max = await this.prisma.media.findFirst({
      where: { contentId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return max ? max.order + 1 : 0;
  }
}
