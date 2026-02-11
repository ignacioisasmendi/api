import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublisherFactory } from '../publishers/publisher.factory';
import { 
  CreatePublicationDto, 
  BulkCreatePublicationDto, 
  UpdatePublicationDto 
} from './dto/publication.dto';
import { Publication, PublicationStatus, Prisma, User, Platform } from '@prisma/client';

// Tipo para publicación con relaciones
type PublicationWithRelations = Prisma.PublicationGetPayload<{
  include: { 
    content: { include: { media: true } }; 
    socialAccount: true;
    mediaUsage: { include: { media: true }; orderBy: { order: 'asc' } };
  };
}>;

@Injectable()
export class PublicationService {
  private readonly logger = new Logger(PublicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisherFactory: PublisherFactory,
  ) {}

  async createPublication(dto: CreatePublicationDto, user: User): Promise<PublicationWithRelations> {
    try {
      // Verify content exists and belongs to user
      const content = await this.prisma.content.findFirst({
        where: {
          id: dto.contentId,
          userId: user.id,
        },
        include: { media: true },
      });

      if (!content) {
        throw new BadRequestException('Content not found or does not belong to user');
      }

      // Verify all media IDs belong to this content
      const mediaIds = dto.mediaIds.map(m => m.mediaId);
      const validMedia = content.media.filter(m => mediaIds.includes(m.id));
      
      if (validMedia.length !== mediaIds.length) {
        throw new BadRequestException('Some media IDs do not belong to this content');
      }

      // Verify social account exists and belongs to user
      const socialAccount = await this.prisma.socialAccount.findFirst({
        where: {
          id: dto.socialAccountId,
          userId: user.id,
          isActive: true,
        },
      });

      if (!socialAccount) {
        throw new BadRequestException('Social account not found or not active');
      }

      // Create publication with media relations
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
            create: dto.mediaIds.map(m => ({
              mediaId: m.mediaId,
              order: m.order || 0,
              cropData: m.cropData,
            })),
          },
        },
        include: {
          content: { include: { media: true } },
          socialAccount: true,
          mediaUsage: { 
            include: { media: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      this.logger.log(`Created publication ${publication.id} for ${socialAccount.platform}`);
      return publication;
    } catch (error) {
      this.logger.error('Error creating publication', error);
      throw error;
    }
  }

 /*  async bulkCreatePublications(dto: BulkCreatePublicationDto, userId: string): Promise<PublicationWithRelations[]> {
    try {
      // Verify content exists and belongs to user
      const content = await this.prisma.content.findFirst({
        where: {
          id: dto.contentId,
          userId: userId,
        },
        include: { media: true },
      });

      if (!content) {
        throw new BadRequestException('Content not found or does not belong to user');
      }

      // Validate all social accounts and media
      for (const pub of dto.publications) {
        const socialAccount = await this.prisma.socialAccount.findFirst({
          where: {
            id: pub.socialAccountId,
            userId: userId,
            isActive: true,
          },
        });

        if (!socialAccount) {
          throw new BadRequestException(`Social account ${pub.socialAccountId} not found or not active`);
        }

        // Verify all media IDs belong to this content
        const mediaIds = pub.mediaIds.map(m => m.mediaId);
        const validMedia = content.media.filter(m => mediaIds.includes(m.id));
        
        if (validMedia.length !== mediaIds.length) {
          throw new BadRequestException('Some media IDs do not belong to this content');
        }
      }

      // Create all publications
      const publications = await Promise.all(
        dto.publications.map((pub) =>
          this.prisma.publication.create({
            data: {
              contentId: dto.contentId,
              socialAccountId: pub.socialAccountId,
              platform: pub.socialAccount?.platform as Platform,
              format: pub.format,
              publishAt: new Date(pub.publishAt),
              customCaption: pub.customCaption,
              platformConfig: pub.platformConfig,
              status: PublicationStatus.SCHEDULED,
              mediaUsage: {
                create: pub.mediaIds.map(m => ({
                  mediaId: m.mediaId,
                  order: m.order || 0,
                  cropData: m.cropData,
                })),
              },
            },
            include: {
              content: { include: { media: true } },
              socialAccount: true,
              mediaUsage: { 
                include: { media: true },
                orderBy: { order: 'asc' },
              },
            },
          }),
        ),
      );

      this.logger.log(`Created ${publications.length} publications for content ${dto.contentId}`);
      return publications;
    } catch (error) {
      this.logger.error('Error creating bulk publications', error);
      throw error;
    }
  } */

  async getPublication(id: string): Promise<PublicationWithRelations> {
    const publication = await this.prisma.publication.findUnique({
      where: { id },
      include: { 
        content: { include: { media: true } },
        socialAccount: true,
        mediaUsage: { 
          include: { media: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!publication) {
      throw new NotFoundException(`Publication ${id} not found`);
    }

    return publication;
  }

  async listPublications(filters?: {
    platform?: string;
    status?: PublicationStatus;
    contentId?: string;
    userId?: string;
  }): Promise<PublicationWithRelations[]> {
    return this.prisma.publication.findMany({
      where: {
        ...(filters?.platform && { platform: filters.platform as any }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.contentId && { contentId: filters.contentId }),
        ...(filters?.userId && { 
          content: { 
            userId: filters.userId 
          } 
        }),
      },
      include: { 
        content: { include: { media: true } },
        socialAccount: true,
        mediaUsage: { 
          include: { media: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { publishAt: 'asc' },
    });
  }

  async updatePublication(id: string, dto: UpdatePublicationDto): Promise<PublicationWithRelations> {
    const publication = await this.getPublication(id);

    // Don't allow updates to published or publishing posts
    if (publication.status === PublicationStatus.PUBLISHED || 
        publication.status === PublicationStatus.PUBLISHING) {
      throw new BadRequestException('Cannot update publication that is already published or publishing');
    }

    // Prepare update data
    const updateData: any = {
      ...(dto.publishAt && { publishAt: new Date(dto.publishAt) }),
      ...(dto.customCaption !== undefined && { customCaption: dto.customCaption }),
      ...(dto.platformConfig && { platformConfig: dto.platformConfig }),
      ...(dto.status && { status: dto.status }),
    };

    // Handle media updates
    if (dto.mediaIds) {
      // Verify all media IDs belong to the content
      const content = await this.prisma.content.findUnique({
        where: { id: publication.contentId },
        include: { media: true },
      });

      const mediaIds = dto.mediaIds.map(m => m.mediaId);
      const validMedia = content!.media.filter(m => mediaIds.includes(m.id));
      
      if (validMedia.length !== mediaIds.length) {
        throw new BadRequestException('Some media IDs do not belong to this content');
      }

      // Delete old media relations and create new ones
      await this.prisma.publicationMedia.deleteMany({
        where: { publicationId: id },
      });

      updateData.mediaUsage = {
        create: dto.mediaIds.map(m => ({
          mediaId: m.mediaId,
          order: m.order || 0,
          cropData: m.cropData,
        })),
      };
    }

    return this.prisma.publication.update({
      where: { id },
      data: updateData,
      include: { 
        content: { include: { media: true } },
        socialAccount: true,
        mediaUsage: { 
          include: { media: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async deletePublication(id: string): Promise<void> {
    const publication = await this.getPublication(id);

    // Don't allow deletion of publishing posts
    if (publication.status === PublicationStatus.PUBLISHING) {
      throw new BadRequestException('Cannot delete publication that is currently publishing');
    }

    await this.prisma.publication.delete({ where: { id } });
    this.logger.log(`Deleted publication ${id}`);
  }

  async getScheduledPublications(): Promise<PublicationWithRelations[]> {
    return this.prisma.publication.findMany({
      where: {
        publishAt: { lte: new Date() },
        status: PublicationStatus.SCHEDULED,
      },
      include: { 
        content: { include: { media: true } },
        socialAccount: true,
        mediaUsage: { 
          include: { media: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { publishAt: 'asc' },
    });
  }

  async updatePublicationStatus(
    id: string,
    status: PublicationStatus,
    error?: string,
    platformId?: string,
    link?: string,
  ): Promise<Publication> {
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
