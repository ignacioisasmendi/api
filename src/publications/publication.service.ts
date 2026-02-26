import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePublicationDto,
  BulkCreatePublicationDto,
  UpdatePublicationDto,
} from './dto/publication.dto';
import { PublicationStatus, Prisma, Platform } from '@prisma/client';
import { PaginatedResponse, PaginationDto } from '../common/dto/pagination.dto';

// Exported so publishers and the cron service can import it
export type PublicationWithRelations = Prisma.PublicationGetPayload<{
  include: {
    content: { include: { media: true } };
    socialAccount: true;
    mediaUsage: { include: { media: true } };
  };
}>;

// Typed select that intentionally excludes sensitive fields (accessToken, refreshToken)
// from the socialAccount relation in all API-facing responses.
const PUBLICATION_SELECT = {
  id: true,
  platform: true,
  format: true,
  publishAt: true,
  status: true,
  error: true,
  customCaption: true,
  platformConfig: true,
  platformId: true,
  link: true,
  contentId: true,
  socialAccountId: true,
  kanbanColumnId: true,
  kanbanOrder: true,
  createdAt: true,
  updatedAt: true,
  content: {
    select: {
      id: true,
      caption: true,
      clientId: true,
      media: { orderBy: { order: 'asc' as const } },
    },
  },
  socialAccount: {
    select: {
      id: true,
      platform: true,
      username: true,
      platformUserId: true,
      isActive: true,
      clientId: true,
      // accessToken and refreshToken intentionally excluded
    },
  },
  mediaUsage: {
    include: { media: true },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.PublicationSelect;

// Full include used internally by the cron job — includes tokens needed for publishing
export const PUBLICATION_FULL_INCLUDE = {
  content: { include: { media: true } },
  socialAccount: true,
  mediaUsage: { include: { media: true }, orderBy: { order: 'asc' as const } },
} satisfies Prisma.PublicationInclude;

@Injectable()
export class PublicationService {
  private readonly logger = new Logger(PublicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPublication(dto: CreatePublicationDto, clientId: string) {
    // Parallel validation — avoids two sequential round-trips to the DB
    const [content, socialAccount] = await Promise.all([
      this.prisma.content.findFirst({
        where: { id: dto.contentId, clientId },
        include: { media: true },
      }),
      this.prisma.socialAccount.findFirst({
        where: { id: dto.socialAccountId, clientId, isActive: true },
      }),
    ]);

    if (!content) {
      throw new BadRequestException(
        'Content not found or does not belong to this client',
      );
    }

    if (!socialAccount) {
      throw new BadRequestException('Social account not found or not active');
    }

    // Verify all media IDs belong to this content
    const mediaIds = dto.mediaIds.map((m) => m.mediaId);
    const validMedia = content.media.filter((m) => mediaIds.includes(m.id));

    if (validMedia.length !== mediaIds.length) {
      throw new BadRequestException(
        'Some media IDs do not belong to this content',
      );
    }

    const publication = await this.prisma.publication.create({
      data: {
        contentId: dto.contentId,
        socialAccountId: dto.socialAccountId,
        platform: socialAccount.platform,
        format: dto.format,
        publishAt: new Date(dto.publishAt),
        customCaption: dto.customCaption,
        platformConfig: dto.platformConfig,
        status: PublicationStatus.SCHEDULED,
        mediaUsage: {
          create: dto.mediaIds.map((m) => ({
            mediaId: m.mediaId,
            order: m.order ?? 0,
            cropData: m.cropData,
          })),
        },
      },
      select: PUBLICATION_SELECT,
    });

    this.logger.log(
      `Created publication ${publication.id} for ${socialAccount.platform}`,
    );
    return publication;
  }

  async getPublication(id: string, clientId: string) {
    const publication = await this.prisma.publication.findFirst({
      where: {
        id,
        content: { clientId }, // ownership check via relation filter
      },
      select: PUBLICATION_SELECT,
    });

    if (!publication) {
      throw new NotFoundException(`Publication ${id} not found`);
    }

    return publication;
  }

  async listPublications(
    filters: {
      clientId: string;
      platform?: Platform;
      status?: PublicationStatus;
      contentId?: string;
      calendarId?: string;
    },
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<unknown>> {
    const where: Prisma.PublicationWhereInput = {
      ...(filters.platform && { platform: filters.platform }),
      ...(filters.status && { status: filters.status }),
      ...(filters.contentId && { contentId: filters.contentId }),
      content: {
        clientId: filters.clientId,
        ...(filters.calendarId && { calendarId: filters.calendarId }),
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.publication.findMany({
        where,
        select: PUBLICATION_SELECT,
        orderBy: { publishAt: 'asc' },
        take: pagination.limit,
        skip: pagination.skip,
      }),
      this.prisma.publication.count({ where }),
    ]);

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

  async updatePublication(
    id: string,
    clientId: string,
    dto: UpdatePublicationDto,
  ) {
    const publication = await this.getPublication(id, clientId);

    // Don't allow updates to published or publishing posts
    if (
      publication.status === PublicationStatus.PUBLISHED ||
      publication.status === PublicationStatus.PUBLISHING
    ) {
      throw new BadRequestException(
        'Cannot update publication that is already published or publishing',
      );
    }

    const updateData: Prisma.PublicationUpdateInput = {
      ...(dto.publishAt && { publishAt: new Date(dto.publishAt) }),
      ...(dto.customCaption !== undefined && {
        customCaption: dto.customCaption,
      }),
      ...(dto.platformConfig && { platformConfig: dto.platformConfig }),
      ...(dto.status && { status: dto.status }),
    };

    // Handle media updates atomically
    if (dto.mediaIds) {
      const content = await this.prisma.content.findUnique({
        where: { id: publication.contentId },
        include: { media: true },
      });

      const mediaIds = dto.mediaIds.map((m) => m.mediaId);
      const validMedia = content!.media.filter((m) => mediaIds.includes(m.id));

      if (validMedia.length !== mediaIds.length) {
        throw new BadRequestException(
          'Some media IDs do not belong to this content',
        );
      }

      await this.prisma.$transaction([
        this.prisma.publicationMedia.deleteMany({
          where: { publicationId: id },
        }),
        this.prisma.publicationMedia.createMany({
          data: dto.mediaIds.map((m) => ({
            publicationId: id,
            mediaId: m.mediaId,
            order: m.order ?? 0,
            cropData: m.cropData,
          })),
        }),
      ]);
    }

    return this.prisma.publication.update({
      where: { id },
      data: updateData,
      select: PUBLICATION_SELECT,
    });
  }

  async deletePublication(id: string, clientId: string): Promise<void> {
    const publication = await this.getPublication(id, clientId);

    // Don't allow deletion of publishing posts
    if (publication.status === PublicationStatus.PUBLISHING) {
      throw new BadRequestException(
        'Cannot delete publication that is currently publishing',
      );
    }

    await this.prisma.publication.delete({ where: { id } });
    this.logger.log(`Deleted publication ${id}`);
  }

  /**
   * Used by the cron job — returns full relations including tokens needed for publishing.
   * The `take` param enforces the configured batch size to prevent DB overload.
   */
  async getScheduledPublications(
    take: number,
  ): Promise<PublicationWithRelations[]> {
    return this.prisma.publication.findMany({
      where: {
        publishAt: { lte: new Date() },
        status: PublicationStatus.SCHEDULED,
      },
      include: PUBLICATION_FULL_INCLUDE,
      orderBy: { publishAt: 'asc' },
      take,
    });
  }

  async moveToKanbanColumn(
    id: string,
    clientId: string,
    dto: { columnId?: string | null; kanbanOrder?: number },
  ) {
    const publication = await this.prisma.publication.findFirst({
      where: { id, content: { clientId } },
      select: { id: true, content: { select: { calendarId: true } } },
    });

    if (!publication) {
      throw new NotFoundException(`Publication ${id} not found`);
    }

    if (dto.columnId) {
      const column = await this.prisma.kanbanColumn.findFirst({
        where: {
          id: dto.columnId,
          calendarId: publication.content.calendarId!,
        },
      });

      if (!column) {
        throw new BadRequestException(
          `Column ${dto.columnId} not found in this calendar`,
        );
      }
    }

    return this.prisma.publication.update({
      where: { id },
      data: {
        kanbanColumnId: dto.columnId ?? null,
        ...(dto.kanbanOrder !== undefined && { kanbanOrder: dto.kanbanOrder }),
      },
      select: PUBLICATION_SELECT,
    });
  }

  async updatePublicationStatus(
    id: string,
    status: PublicationStatus,
    error?: string,
    platformId?: string,
    link?: string,
  ) {
    return this.prisma.publication.update({
      where: { id },
      data: {
        status,
        ...(error && { error }),
        ...(platformId && { platformId }),
        ...(link && { link }),
      },
    });
  }
}
