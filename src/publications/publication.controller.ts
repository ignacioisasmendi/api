import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { PublicationService } from './publication.service';
import {
  CreatePublicationDto,
  UpdatePublicationDto
} from './dto/publication.dto';
import { PublicationStatus, Platform } from '@prisma/client';
import { GetClientId } from 'src/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('publications')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * Create a single publication
   * POST /publications
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@GetClientId() clientId: string, @Body() dto: CreatePublicationDto) {
    return this.publicationService.createPublication(dto, clientId);
  }

  /**
   * Get all publications with optional filters (paginated)
   * GET /publications?platform=INSTAGRAM&status=SCHEDULED&page=1&limit=20
   */
  @Get()
  async list(
    @GetClientId() clientId: string,
    @Query() pagination: PaginationDto,
    @Query('platform') platform?: Platform,
    @Query('status') status?: PublicationStatus,
    @Query('contentId') contentId?: string,
    @Query('calendarId') calendarId?: string,
  ) {
    return this.publicationService.listPublications(
      { clientId, platform, status, contentId, calendarId },
      pagination,
    );
  }

  /**
   * Get a specific publication by ID (ownership enforced via clientId)
   * GET /publications/:id
   */
  @Get(':id')
  async getOne(@GetClientId() clientId: string, @Param('id') id: string) {
    return this.publicationService.getPublication(id, clientId);
  }

  /**
   * Update a publication (ownership enforced via clientId)
   * PUT /publications/:id
   */
  @Put(':id')
  async update(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePublicationDto,
  ) {
    return this.publicationService.updatePublication(id, clientId, dto);
  }

  /**
   * Delete a publication (ownership enforced via clientId)
   * DELETE /publications/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@GetClientId() clientId: string, @Param('id') id: string) {
    await this.publicationService.deletePublication(id, clientId);
  }
}

/**
 * Platform-specific controllers for filtered list endpoints
 */
@Controller('instagram/publications')
export class InstagramPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get()
  async list(
    @GetClientId() clientId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: PublicationStatus,
  ) {
    return this.publicationService.listPublications(
      { platform: Platform.INSTAGRAM, status, clientId },
      pagination,
    );
  }
}

@Controller('facebook/publications')
export class FacebookPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get()
  async list(
    @GetClientId() clientId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: PublicationStatus,
  ) {
    return this.publicationService.listPublications(
      { platform: Platform.FACEBOOK, status, clientId },
      pagination,
    );
  }
}

@Controller('tiktok/publications')
export class TikTokPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get()
  async list(
    @GetClientId() clientId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: PublicationStatus,
  ) {
    return this.publicationService.listPublications(
      { platform: Platform.TIKTOK, status, clientId },
      pagination,
    );
  }
}

@Controller('x/publications')
export class XPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get()
  async list(
    @GetClientId() clientId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: PublicationStatus,
  ) {
    return this.publicationService.listPublications(
      { platform: Platform.X, status, clientId },
      pagination,
    );
  }
}
