import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ShareLinkService } from './share-link.service';
import { CreateShareLinkDto } from './dto/share-link.dto';
import { GetClientId } from '../decorators';

@Controller('calendars/:calendarId/share-links')
@UseGuards(ThrottlerGuard)
export class ShareLinkController {
  constructor(private readonly shareLinkService: ShareLinkService) {}

  /**
   * Generate a new share link for a calendar
   * POST /calendars/:calendarId/share-links
   * Rate limit: 20 per hour to prevent token enumeration
   */
  @Post()
  @Throttle({ long: { ttl: 3600000, limit: 20 } })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.shareLinkService.createShareLink(calendarId, clientId, dto);
  }

  /**
   * List all share links for a calendar
   * GET /calendars/:calendarId/share-links
   */
  @Get()
  async list(
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
  ) {
    return this.shareLinkService.listShareLinks(calendarId, clientId);
  }

  /**
   * Revoke a share link
   * DELETE /calendars/:calendarId/share-links/:linkId
   */
  @Delete(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
    @Param('linkId') linkId: string,
  ) {
    await this.shareLinkService.revokeShareLink(calendarId, linkId, clientId);
  }

  /**
   * Regenerate a share link (revokes old, creates new)
   * POST /calendars/:calendarId/share-links/:linkId/regenerate
   */
  @Post(':linkId/regenerate')
  async regenerate(
    @GetClientId() clientId: string,
    @Param('calendarId') calendarId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.shareLinkService.regenerateShareLink(
      calendarId,
      linkId,
      clientId,
    );
  }
}
