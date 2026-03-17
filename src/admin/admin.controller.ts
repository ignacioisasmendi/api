import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { SkipClientValidation } from '../decorators';
import { AdminUsersQueryDto } from './dto/admin.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('admin')
@UseGuards(AdminGuard)
@SkipClientValidation()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Get('waitlist/growth')
  getWaitlistGrowth() {
    return this.adminService.getWaitlistGrowth();
  }

  @Get('waitlist')
  getWaitlist(@Query() query: PaginationDto) {
    return this.adminService.getWaitlist(query);
  }
}
