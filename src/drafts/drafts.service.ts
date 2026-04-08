import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../shared/storage/storage.service';
import { CreateDraftDto, UpdateDraftDto, ListDraftsQueryDto } from './dto/draft.dto';

@Injectable()
export class DraftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(userId: string, clientId: string, dto: CreateDraftDto) {
    if (dto.calendarId) {
      const calendar = await this.prisma.calendar.findFirst({
        where: { id: dto.calendarId, clientId },
      });
      if (!calendar) {
        throw new NotFoundException(
          `Calendar ${dto.calendarId} not found for this client`,
        );
      }
    }

    return this.prisma.draft.create({
      data: {
        userId,
        clientId,
        title: dto.title,
        date: new Date(dto.date),
        calendarId: dto.calendarId,
        platforms: dto.platforms ?? [],
        contentType: dto.contentType,
        objective: dto.objective,
        caption: dto.caption,
        notes: dto.notes,
        referenceUrl: dto.referenceUrl,
        referenceImageUrl: dto.referenceImageUrl,
        referenceImageKey: dto.referenceImageKey,
      },
    });
  }

  async findAll(clientId: string, query: ListDraftsQueryDto) {
    const where: any = { clientId };

    if (query.calendarId) {
      where.calendarId = query.calendarId;
    }

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const data = await this.prisma.draft.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return { data };
  }

  async findOne(id: string, clientId: string) {
    const draft = await this.prisma.draft.findFirst({
      where: { id, clientId },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${id} not found`);
    }

    return draft;
  }

  async update(id: string, clientId: string, dto: UpdateDraftDto) {
    const existing = await this.findOne(id, clientId);

    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.calendarId !== undefined) {
      if (dto.calendarId !== null) {
        const calendar = await this.prisma.calendar.findFirst({
          where: { id: dto.calendarId, clientId },
        });
        if (!calendar) {
          throw new NotFoundException(
            `Calendar ${dto.calendarId} not found for this client`,
          );
        }
      }
      data.calendarId = dto.calendarId;
    }
    if (dto.contentType !== undefined) data.contentType = dto.contentType;
    if (dto.platforms !== undefined) data.platforms = dto.platforms;
    if (dto.objective !== undefined) data.objective = dto.objective;
    if (dto.caption !== undefined) data.caption = dto.caption;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.referenceUrl !== undefined) data.referenceUrl = dto.referenceUrl;

    if (dto.referenceImageUrl !== undefined) {
      if (
        existing.referenceImageKey &&
        dto.referenceImageUrl !== existing.referenceImageUrl
      ) {
        try {
          await this.storageService.deleteFile(existing.referenceImageKey);
        } catch {}
      }
      data.referenceImageUrl = dto.referenceImageUrl;
      data.referenceImageKey = dto.referenceImageKey ?? null;
    }

    return this.prisma.draft.update({ where: { id }, data });
  }

  async remove(id: string, clientId: string): Promise<void> {
    const draft = await this.findOne(id, clientId);

    if (draft.referenceImageKey) {
      try {
        await this.storageService.deleteFile(draft.referenceImageKey);
      } catch {}
    }

    await this.prisma.draft.delete({ where: { id } });
  }
}
