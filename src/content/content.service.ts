import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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

  constructor(private readonly prisma: PrismaService) {}

  async createContent(dto: CreateContentDto, userId: string): Promise<ContentWithMedia> {
    try {
      // Create content with media in a transaction
      //instead of saving the url, change the uri part for this 

      const publicUrl = 'https://pub-d773025cd8974c48920973fa89738174.r2.dev';
      const key = dto.media[0].key;
      const url = `${publicUrl}/${key}`;

      const content = await this.prisma.content.create({
        data: {
          userId,
          caption: dto.caption,
          media: {
            create: dto.media.map((m, index) => ({
              url: url,
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
    } catch (error) {
      this.logger.error('Error creating content', error);
      throw error;
    }
  }

  async getContent(id: string, userId: string): Promise<ContentWithMedia> {
    const content = await this.prisma.content.findFirst({
      where: { id, userId },
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

  async listContent(userId: string): Promise<ContentWithMedia[]> {
    return this.prisma.content.findMany({
      where: { userId },
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

  async updateContent(id: string, userId: string, dto: UpdateContentDto): Promise<ContentWithMedia> {
    // Verify ownership
    await this.getContent(id, userId);

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

  async addMedia(id: string, userId: string, dto: AddMediaToContentDto): Promise<ContentWithMedia> {
    // Verify ownership
    await this.getContent(id, userId);

    // Get current max order
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

  async deleteContent(id: string, userId: string): Promise<void> {
    // Verify ownership
    const content = await this.getContent(id, userId);

    // Check if content has any non-errored publications
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

  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    // Find media and verify ownership
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        content: { userId },
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
