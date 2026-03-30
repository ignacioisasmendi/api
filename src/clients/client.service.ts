import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../shared/storage/storage.service';
import { PlanService } from '../plans/plan.service';
import { ClsService } from 'nestjs-cls';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SaveLogoDto } from './dto/save-logo.dto';
import { Client } from '@prisma/client';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly planService: PlanService,
    private readonly cls: ClsService,
  ) {}

  async createClient(dto: CreateClientDto, userId: string): Promise<Client> {
    const user = this.cls.get('user');
    if (user) {
      await this.planService.assertCanCreateClient(userId, user.plan);
    }

    const client = await this.prisma.client.create({
      data: {
        userId,
        name: dto.name,
        avatar: dto.avatar,
      },
    });

    this.logger.log(`Client created: ${client.id} by user ${userId}`);
    return client;
  }

  private async withSignedLogoUrl(client: Client): Promise<Client> {
    if (!client.logoKey) return client;
    try {
      const logoUrl = await this.storage.getSignedUrl(client.logoKey, 3600);
      return { ...client, logoUrl };
    } catch (err) {
      this.logger.warn({ err, key: client.logoKey }, 'Failed to sign logo URL');
      return client;
    }
  }

  async listClients(userId: string): Promise<Client[]> {
    const clients = await this.prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(clients.map((c) => this.withSignedLogoUrl(c)));
  }

  async getClient(id: string, userId: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return this.withSignedLogoUrl(client);
  }

  async updateClient(
    id: string,
    userId: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    await this.getClient(id, userId);

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
      },
    });
  }

  async deleteClient(id: string, userId: string): Promise<void> {
    await this.getClient(id, userId);

    await this.prisma.client.delete({ where: { id } });
    this.logger.log(`Client deleted: ${id} by user ${userId}`);
  }

  async saveLogo(id: string, userId: string, dto: SaveLogoDto): Promise<Client> {
    const client = await this.getClient(id, userId);

    // Delete old logo from R2 if it exists
    if (client.logoKey) {
      await this.storage.deleteFile(client.logoKey).catch((err) => {
        this.logger.warn({ err, key: client.logoKey }, 'Failed to delete old logo');
      });
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: { logoUrl: dto.logoUrl, logoKey: dto.logoKey },
    });

    this.logger.log(`Logo saved for client ${id}`);
    return this.withSignedLogoUrl(updated);
  }

  async deleteLogo(id: string, userId: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    if (!client.logoKey) {
      throw new NotFoundException(`Client ${id} has no logo`);
    }

    await this.storage.deleteFile(client.logoKey);

    const updated = await this.prisma.client.update({
      where: { id },
      data: { logoUrl: null, logoKey: null },
    });

    this.logger.log(`Logo deleted for client ${id}`);
    return updated;
  }

  async verifyOwnership(clientId: string, userId: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }

    return client;
  }
}
