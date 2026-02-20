import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto, UpdateContentDto, AddMediaToContentDto } from './dto/content.dto';
import { Content, Media, Prisma } from '@prisma/client';

// Type for content with media relations
type ContentWithMedia = Prisma.ContentGetPayload<{
  include: { media: true; publications: true };
}>;

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createContent(dto: CreateContentDto, userId: string, clientId: string): Promise<ContentWithMedia> {
    const content = await this.prisma.content.create({
      data: {
        userId,
        clientId,
        caption: dto.caption,
        media: {
          create: dto.media.map((m, index) => ({
            url: m.url,
            key: m.key,
            type: m.type,
            mimeType: m.mimeType,
            size: m.size,
            width: m.width,
            height: m.height,
            duration: m.duration,
            thumbnail: m.thumbnail,
            order: m.order !== undefined ? m.order : index,
          })),
        },
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        publications: true,
      },
    });

    this.logger.log(`Created content ${content.id} with ${dto.media.length} media files`);
    return content;
  }

  async getContent(id: string, clientId: string): Promise<ContentWithMedia> {
    const content = await this.prisma.content.findFirst({
      where: { id, clientId },
      include: {
        media: { orderBy: { order: 'asc' } },
        publications: {
          include: {
            socialAccount: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    return content;
  }

  async listContent(clientId: string): Promise<ContentWithMedia[]> {
    return this.prisma.content.findMany({
      where: { clientId },
      include: {
        media: { orderBy: { order: 'asc' } },
        publications: {
          include: {
            socialAccount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateContent(id: string, clientId: string, dto: UpdateContentDto): Promise<ContentWithMedia> {
    await this.getContent(id, clientId);

    return this.prisma.content.update({
      where: { id },
      data: {
        caption: dto.caption,
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        publications: true,
      },
    });
  }

  async addMedia(id: string, clientId: string, dto: AddMediaToContentDto): Promise<ContentWithMedia> {
    await this.getContent(id, clientId);

    const maxOrder = await this.prisma.media.findFirst({
      where: { contentId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const startOrder = maxOrder ? maxOrder.order + 1 : 0;

    return this.prisma.content.update({
      where: { id },
      data: {
        media: {
          create: dto.media.map((m, index) => ({
            url: m.url,
            key: m.key,
            type: m.type,
            mimeType: m.mimeType,
            size: m.size,
            width: m.width,
            height: m.height,
            duration: m.duration,
            thumbnail: m.thumbnail,
            order: m.order !== undefined ? m.order : startOrder + index,
          })),
        },
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        publications: true,
      },
    });
  }

  async deleteContent(id: string, clientId: string): Promise<void> {
    const content = await this.getContent(id, clientId);

    const activePublications = content.publications.filter(
      (p) => p.status !== 'ERROR',
    );

    if (activePublications.length > 0) {
      throw new BadRequestException(
        'Cannot delete content with active publications. Delete publications first.',
      );
    }

    await this.prisma.content.delete({ where: { id } });
    this.logger.log(`Deleted content ${id}`);
  }

  async deleteMedia(mediaId: string, clientId: string): Promise<void> {
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        content: { clientId },
      },
      include: {
        publicationUsage: true,
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.publicationUsage.length > 0) {
      throw new BadRequestException(
        'Cannot delete media that is used in publications',
      );
    }

    await this.prisma.media.delete({ where: { id: mediaId } });
    this.logger.log(`Deleted media ${mediaId}`);
  }
}
