import { Controller, Delete, Get, HttpCode, Param, Put, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { GetUser } from '../decorators/get-user.decorator';
import { GetClientId } from '../decorators';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Obtener el perfil del usuario autenticado
   * GET /users/me
   */
  @Get('me')
  async getProfile(@GetUser() user: User) {
    return this.userService.mapToResponse(user);
  }

  /**
   * Obtener el perfil con cuentas sociales (sin tokens sensibles)
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
   * Desconectar una cuenta social
   * DELETE /users/me/social-accounts/:id
   */
  @Delete('me/social-accounts/:id')
  @HttpCode(204)
  async disconnectSocialAccount(
    @GetUser() user: User,
    @Param('id') socialAccountId: string,
  ) {
    await this.userService.disconnectSocialAccount(user.id, socialAccountId);
  }

  /**
   * Actualizar el perfil del usuario
   * PUT /users/me
   */
  @Put('me')
  async updateProfile(@GetUser() user: User, @Body() dto: UpdateUserDto) {
    const updated = await this.userService.updateUser(user.id, dto);
    return this.userService.mapToResponse(updated);
  }
}
