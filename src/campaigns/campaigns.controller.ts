import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { GetClientId } from '../decorators';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@GetClientId() clientId: string, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(clientId, dto);
  }

  @Get()
  findAll(
    @GetClientId() clientId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.campaignsService.findAll(clientId, pagination);
  }

  @Get(':id')
  findOne(@GetClientId() clientId: string, @Param('id') id: string) {
    return this.campaignsService.findOne(id, clientId);
  }

  @Patch(':id')
  update(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, clientId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GetClientId() clientId: string, @Param('id') id: string) {
    await this.campaignsService.remove(id, clientId);
  }
}
