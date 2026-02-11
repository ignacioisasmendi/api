import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { GetUser } from './decorators/get-user.decorator';
import { IsPublic } from './decorators/public.decorator';
import { User } from '@prisma/client';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @IsPublic() // Marcar esta ruta como pública (no requiere autenticación)
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('me')
  getProfile(@GetUser() user: User) {
    // El usuario ya está autenticado y guardado en la BD gracias al guard global
    return {
      message: 'Profile retrieved successfully',
      user,
    };
  }
}
