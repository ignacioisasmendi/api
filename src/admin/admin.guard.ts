import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly cls: ClsService,
  ) {}

  canActivate(_ctx: ExecutionContext): boolean {
    const user = this.cls.get('user');
    if (!user?.email) throw new ForbiddenException('Admin access required');

    const adminEmails = this.configService.get<string[]>('admin.emails') ?? [];
    if (!adminEmails.includes(user.email)) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
