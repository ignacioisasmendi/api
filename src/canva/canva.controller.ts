import { Controller, NotFoundException, Post } from '@nestjs/common';
import { CanvaService } from './canva.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/shared/encryption/encryption.service';
import { GetUser, GetClientId } from 'src/decorators';
import { User } from '@prisma/client';

@Controller('canva')
export class CanvaController {
  constructor(
    private readonly canvaService: CanvaService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * POST /canva/designs
   * Creates a new blank design in the user's Canva account and returns
   * the direct editor URL.
   */
  @Post('designs')
  async createDesign(
    @GetUser() user: User,
    @GetClientId() clientId: string,
  ): Promise<{ editUrl: string }> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId: user.id,
        clientId,
        platform: 'CANVA',
        isActive: true,
      },
    });

    if (!account?.accessToken) {
      throw new NotFoundException('No connected Canva account found');
    }

    const accessToken = this.encryptionService.decrypt(account.accessToken);
    const editUrl = await this.canvaService.createDesign(accessToken!);

    return { editUrl };
  }
}
