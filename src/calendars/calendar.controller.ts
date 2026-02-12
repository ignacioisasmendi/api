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
import { CalendarService } from './calendar.service';
import {
  CreateCalendarDto,
  UpdateCalendarDto,
  AssignContentDto,
} from './dto/calendar.dto';
import { GetUser } from '../decorators/get-user.decorator';
import { User } from '@prisma/client';
import { GetClientId } from 'src/decorators';

@Controller('calendars')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Create a new calendar
   * POST /calendars
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@GetUser() user: User, @GetClientId() clientId: string, @Body() dto: CreateCalendarDto) {
    return this.calendarService.createCalendar(dto, user.id, clientId);
  }

  /**
   * List all calendars for the authenticated client
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
   * Update a calendar
   * PATCH /calendars/:id
   */
  @Patch(':id')
  async update(
    @GetClientId() clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarDto,
  ) {
    return this.calendarService.updateCalendar(id, clientId, dto);
  }

  /**
   * Delete a calendar (cascades share links and comments)
   * DELETE /calendars/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@GetClientId() clientId: string, @Param('id') id: string) {
    await this.calendarService.deleteCalendar(id, clientId);
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
