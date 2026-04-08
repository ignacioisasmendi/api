import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../shared/storage/storage.service';
import {
  CreateFeedbackDto,
  FeedbackUploadUrlDto,
  AdminFeedbackQueryDto,
} from './dto/feedback.dto';
import { FeedbackStatus } from '@prisma/client';
import { PaginatedResponse, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class FeedbackService {
  private static readonly SIGNED_URL_EXPIRY = 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async resolveScreenshotUrl<T extends { screenshotUrl: string | null }>(
    report: T,
  ): Promise<T> {
    if (!report.screenshotUrl) return report;
    const key = report.screenshotUrl;
    if (key.startsWith('http')) return report;
    const signedUrl = await this.storage.getSignedUrl(
      key,
      FeedbackService.SIGNED_URL_EXPIRY,
    );
    return { ...report, screenshotUrl: signedUrl };
  }

  private async resolveScreenshotUrls<T extends { screenshotUrl: string | null }>(
    reports: T[],
  ): Promise<T[]> {
    return Promise.all(reports.map((r) => this.resolveScreenshotUrl(r)));
  }

  async create(userId: string, clientId: string | null, dto: CreateFeedbackDto) {
    const report = await this.prisma.feedbackReport.create({
      data: {
        userId,
        clientId,
        type: dto.type,
        message: dto.message,
        screenshotUrl: dto.screenshotUrl,
      },
      include: { user: { select: { email: true, name: true } } },
    });
    return this.resolveScreenshotUrl(report);
  }

  async findAllByUser(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<unknown>> {
    const where = { userId };

    const [rawData, total] = await Promise.all([
      this.prisma.feedbackReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pagination.limit,
        skip: pagination.skip,
      }),
      this.prisma.feedbackReport.count({ where }),
    ]);

    const data = await this.resolveScreenshotUrls(rawData);

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

  async generateUploadUrl(userId: string, dto: FeedbackUploadUrlDto) {
    const timestamp = Date.now();
    const sanitized = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `feedback/${userId}/${timestamp}_${sanitized}`;

    const uploadUrl = await this.storage.generateUploadUrl(
      key,
      dto.contentType,
      3600,
    );
    const publicUrl = this.storage.getPublicUrl(key);

    return { uploadUrl, key, publicUrl };
  }

  async findAllAdmin(
    query: AdminFeedbackQueryDto,
  ): Promise<PaginatedResponse<unknown>> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const limit = query.limit ?? 20;
    const skip = query.skip;

    const [rawData, total] = await Promise.all([
      this.prisma.feedbackReport.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.feedbackReport.count({ where }),
    ]);

    const data = await this.resolveScreenshotUrls(rawData);

    return {
      data,
      meta: {
        total,
        page: query.page ?? 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneAdmin(id: string) {
    const report = await this.prisma.feedbackReport.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true, avatar: true } } },
    });

    if (!report) {
      throw new NotFoundException(`Feedback report ${id} not found`);
    }

    return this.resolveScreenshotUrl(report);
  }

  async updateStatus(id: string, status: FeedbackStatus) {
    await this.findOneAdminRaw(id);

    const updated = await this.prisma.feedbackReport.update({
      where: { id },
      data: { status },
      include: { user: { select: { id: true, email: true, name: true, avatar: true } } },
    });
    return this.resolveScreenshotUrl(updated);
  }

  async respond(id: string, adminResponse: string) {
    await this.findOneAdminRaw(id);

    const updated = await this.prisma.feedbackReport.update({
      where: { id },
      data: {
        adminResponse,
        respondedAt: new Date(),
        status: FeedbackStatus.IN_PROGRESS,
      },
      include: { user: { select: { id: true, email: true, name: true, avatar: true } } },
    });
    return this.resolveScreenshotUrl(updated);
  }

  private async findOneAdminRaw(id: string) {
    const report = await this.prisma.feedbackReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException(`Feedback report ${id} not found`);
    }
    return report;
  }
}
