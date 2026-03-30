import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../plans/plan.service';
import { ClsService } from 'nestjs-cls';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { PaginatedResponse, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    private readonly cls: ClsService,
  ) {}

  async create(clientId: string, dto: CreateCampaignDto) {
    const user = this.cls.get('user');
    if (user) {
      await this.planService.assertCanCreateCampaign(clientId, user.plan);
    }

    return this.prisma.campaign.create({
      data: {
        clientId,
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        color: dto.color,
      },
      include: { _count: { select: { publications: true } } },
    });
  }

  async findAll(
    clientId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<unknown>> {
    const where = { clientId };

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          _count: { select: { publications: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: pagination.limit,
        skip: pagination.skip,
      }),
      this.prisma.campaign.count({ where }),
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

  async findOne(id: string, clientId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, clientId },
      include: {
        _count: { select: { publications: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }

  async update(id: string, clientId: string, dto: UpdateCampaignDto) {
    await this.findOne(id, clientId);

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: { _count: { select: { publications: true } } },
    });
  }

  async remove(id: string, clientId: string): Promise<void> {
    await this.findOne(id, clientId);
    await this.prisma.campaign.delete({ where: { id } });
  }
}
