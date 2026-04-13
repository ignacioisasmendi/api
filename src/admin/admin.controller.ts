import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { SkipClientValidation } from '../decorators';
import {
  AdminUsersQueryDto,
  AdminUserPublicationsQueryDto,
  AdminWaitlistQueryDto,
  AdminWaitlistInviteSendsQueryDto,
  UpdateUserPlanDto,
  UpdateUserStatusDto,
  InviteBulkDto,
  WaitlistInviteSendLogBatchDto,
} from './dto/admin.dto';
import { FeedbackService } from '../feedback/feedback.service';
import {
  AdminFeedbackQueryDto,
  UpdateFeedbackStatusDto,
  RespondFeedbackDto,
} from '../feedback/dto/feedback.dto';

@Controller('admin')
@UseGuards(AdminGuard)
@SkipClientValidation()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly feedbackService: FeedbackService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Get('users/:id/publications')
  getUserPublications(
    @Param('id') id: string,
    @Query() query: AdminUserPublicationsQueryDto,
  ) {
    return this.adminService.getUserPublications(id, query);
  }

  @Patch('users/:id/plan')
  updateUserPlan(@Param('id') id: string, @Body() dto: UpdateUserPlanDto) {
    return this.adminService.updateUserPlan(id, dto.plan);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto.status);
  }

  @Get('waitlist/export')
  getWaitlistExport() {
    return this.adminService.getWaitlistExport();
  }

  @Get('waitlist/growth')
  getWaitlistGrowth() {
    return this.adminService.getWaitlistGrowth();
  }

  @Get('waitlist')
  getWaitlist(@Query() query: AdminWaitlistQueryDto) {
    return this.adminService.getWaitlist(query);
  }

  @Get('waitlist/invite-sends')
  listWaitlistInviteSends(@Query() query: AdminWaitlistInviteSendsQueryDto) {
    return this.adminService.listWaitlistInviteSends(query);
  }

  @Post('waitlist/invite-sends')
  @HttpCode(HttpStatus.OK)
  recordWaitlistInviteSends(@Body() dto: WaitlistInviteSendLogBatchDto) {
    return this.adminService.recordWaitlistInviteSendsBatch(dto.sends);
  }

  @Post('waitlist/:id/invite')
  @HttpCode(HttpStatus.OK)
  inviteWaitlistEntry(@Param('id') id: string) {
    return this.adminService.inviteWaitlistEntry(id);
  }

  @Post('waitlist/invite-bulk')
  @HttpCode(HttpStatus.OK)
  inviteBulk(@Body() dto: InviteBulkDto) {
    return this.adminService.inviteBulk(dto.ids);
  }

  @Get('feedback')
  listFeedback(@Query() query: AdminFeedbackQueryDto) {
    return this.feedbackService.findAllAdmin(query);
  }

  @Get('feedback/:id')
  getFeedbackDetail(@Param('id') id: string) {
    return this.feedbackService.findOneAdmin(id);
  }

  @Patch('feedback/:id/status')
  updateFeedbackStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.updateStatus(id, dto.status);
  }

  @Post('feedback/:id/respond')
  @HttpCode(HttpStatus.OK)
  respondToFeedback(@Param('id') id: string, @Body() dto: RespondFeedbackDto) {
    return this.feedbackService.respond(id, dto.adminResponse);
  }
}
