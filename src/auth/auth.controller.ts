import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsPublic } from '../decorators/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Resend verification email.
   * Marked public because the main guard blocks unverified users.
   * We decode the JWT without full guard validation to extract the user_id.
   */
  @IsPublic()
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.decode(token);

    if (!decoded?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    try {
      await this.authService.resendVerificationEmail(decoded.sub);
    } catch (error) {
      this.logger.error('Failed to resend verification email', error);
      throw new InternalServerErrorException(
        'Failed to resend verification email',
      );
    }
  }
}
