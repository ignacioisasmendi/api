import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { GetUser } from '../decorators/get-user.decorator';
import { SkipClientValidation } from '../decorators/skip-client-validation.decorator';
import { User } from '@prisma/client';

@Controller('clients')
@SkipClientValidation()
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@GetUser() user: User, @Body() dto: CreateClientDto) {
    return this.clientService.createClient(dto, user.id);
  }

  @Get()
  async list(@GetUser() user: User) {
    return this.clientService.listClients(user.id);
  }

  @Get(':id')
  async get(@GetUser() user: User, @Param('id') id: string) {
    return this.clientService.getClient(id, user.id);
  }

  @Patch(':id')
  async update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientService.updateClient(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@GetUser() user: User, @Param('id') id: string) {
    await this.clientService.deleteClient(id, user.id);
  }
}
