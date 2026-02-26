import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from '@prisma/client';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createClient(dto: CreateClientDto, userId: string): Promise<Client> {
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

  async listClients(userId: string): Promise<Client[]> {
    return this.prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getClient(id: string, userId: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return client;
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
