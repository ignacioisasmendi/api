import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { AssignContentDto } from './dto/calendar.dto';
import { GetClientId } from 'src/decorators';

@Controller('calendars')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * List calendars for the authenticated client (auto-ensures a default row).
   * GET /calendars
   */
  @Get()
  async list(@GetClientId() clientId: string) {
    return this.calendarService.listCalendars(clientId);
  }

  /**
   * Get a specific calendar with all its content and publications
   * GET /calendars/:id
   */
  @Get(':id')
  async get(@GetClientId() clientId: string, @Param('id') id: string) {
    return this.calendarService.getCalendar(id, clientId);
  }

  /**
   * Assign a content to this calendar
   * POST /calendars/:id/contents
   */
  @Post(':id/contents')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignContent(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Body() dto: AssignContentDto,
  ) {
    await this.calendarService.assignContent(id, dto.contentId, clientId);
  }

  /**
   * Remove a content from this calendar
   * DELETE /calendars/:id/contents/:contentId
   */
  @Delete(':id/contents/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignContent(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Param('contentId') contentId: string,
  ) {
    await this.calendarService.unassignContent(id, contentId, clientId);
  }
}
