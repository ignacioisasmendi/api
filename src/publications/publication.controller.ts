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
  BulkCreatePublicationDto, 
  UpdatePublicationDto 
} from './dto/publication.dto';
import { PublicationStatus, Platform, User } from '@prisma/client';
import { GetUser } from '../decorators/get-user.decorator';

@Controller('publications')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * Create a single publication
   * POST /publications
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@GetUser() user: User, @Body() dto: CreatePublicationDto) {
    return this.publicationService.createPublication(dto, user);
  }

  /**
   * Create multiple publications for the same content
   * POST /publications/bulk
   */
 /*  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@GetUser() user: User, @Body() dto: BulkCreatePublicationDto) {
    return this.publicationService.bulkCreatePublications(dto, user.id);
  } */

  /**
   * Get all publications with optional filters
   * GET /publications?platform=INSTAGRAM&status=SCHEDULED
   */
  @Get()
  async list(
    @GetUser() user: User,
    @Query('platform') platform?: Platform,
    @Query('status') status?: PublicationStatus,
    @Query('contentId') contentId?: string,
  ) {
    return this.publicationService.listPublications({
      platform,
      status,
      contentId,
      userId: user.id,
    });
  }

  /**
   * Get a specific publication by ID
   * GET /publications/:id
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.publicationService.getPublication(id);
  }

  /**
   * Update a publication
   * PUT /publications/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePublicationDto) {
    return this.publicationService.updatePublication(id, dto);
  }

  /**
   * Delete a publication
   * DELETE /publications/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.publicationService.deletePublication(id);
  }
}

/**
 * Platform-specific controllers for specialized operations
 */
@Controller('instagram/publications')
export class InstagramPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * Get all Instagram publications
   * GET /instagram/publications
   */
  @Get()
  async list(@GetUser() user: User, @Query('status') status?: PublicationStatus) {
    return this.publicationService.listPublications({
      platform: Platform.INSTAGRAM,
      status,
      userId: user.id,
    });
  }
}

@Controller('facebook/publications')
export class FacebookPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * Get all Facebook publications
   * GET /facebook/publications
   */
  @Get()
  async list(@GetUser() user: User, @Query('status') status?: PublicationStatus) {
    return this.publicationService.listPublications({
      platform: Platform.FACEBOOK,
      status,
      userId: user.id,
    });
  }
}

@Controller('tiktok/publications')
export class TikTokPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * Get all TikTok publications
   * GET /tiktok/publications
   */
  @Get()
  async list(@GetUser() user: User, @Query('status') status?: PublicationStatus) {
    return this.publicationService.listPublications({
      platform: Platform.TIKTOK,
      status,
      userId: user.id,
    });
  }
}

@Controller('x/publications')
export class XPublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * Get all X (Twitter) publications
   * GET /x/publications
   */
  @Get()
  async list(@GetUser() user: User, @Query('status') status?: PublicationStatus) {
    return this.publicationService.listPublications({
      platform: Platform.X,
      status,
      userId: user.id,
    });
  }
}
