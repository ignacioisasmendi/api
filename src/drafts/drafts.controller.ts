import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DraftsService } from './drafts.service';
import {
  CreateDraftDto,
  UpdateDraftDto,
  ListDraftsQueryDto,
} from './dto/draft.dto';
import { GetClientId, GetUser } from '../decorators';

@Controller('drafts')
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @GetUser() user: any,
    @GetClientId() clientId: string,
    @Body() dto: CreateDraftDto,
  ) {
    return this.draftsService.create(user.id, clientId, dto);
  }

  @Get()
  findAll(@GetClientId() clientId: string, @Query() query: ListDraftsQueryDto) {
    return this.draftsService.findAll(clientId, query);
  }

  @Get(':id')
  findOne(@GetClientId() clientId: string, @Param('id') id: string) {
    return this.draftsService.findOne(id, clientId);
  }

  @Put(':id')
  update(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
  ) {
    return this.draftsService.update(id, clientId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GetClientId() clientId: string, @Param('id') id: string) {
    await this.draftsService.remove(id, clientId);
  }
}
