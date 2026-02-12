import { Controller, Get, Put, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { GetUser } from '../decorators/get-user.decorator';
import { GetClientId } from '../decorators';
import { User } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Obtener el perfil del usuario autenticado
   * GET /users/me
   */
  @Get('me')
  async getProfile(@GetUser() user: User) {
    // El usuario ya viene completo desde el guard
    return user;
  }

  /**
   * Obtener el perfil con cuentas sociales
   * GET /users/me/full
   */
  @Get('me/full')
  async getFullProfile(@GetUser() user: User) {
    return this.userService.getUserWithSocialAccounts(user.id);
  }

  /**
   * Obtener todas las cuentas sociales del usuario (activas e inactivas)
   * GET /users/me/social-accounts
   */
  @Get('me/social-accounts')
  async getSocialAccounts(@GetUser() user: User, @GetClientId() clientId: string) {
    return this.userService.getAllSocialAccounts(user.id, clientId);
  }

  /**
   * Actualizar el perfil del usuario
   * PUT /users/me
   */
  @Put('me')
  async updateProfile(@GetUser() user: User, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(user.id, dto);
  }
}
