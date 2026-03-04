import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Body,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SaveLogoDto } from './dto/save-logo.dto';
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

  @Post(':id/logo')
  async saveLogo(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: SaveLogoDto,
  ) {
    return this.clientService.saveLogo(id, user.id, dto);
  }

  @Delete(':id/logo')
  @HttpCode(HttpStatus.OK)
  async deleteLogo(@GetUser() user: User, @Param('id') id: string) {
    return this.clientService.deleteLogo(id, user.id);
  }
}
