import {
  Controller,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CanvaService, CanvaExportResult } from './canva.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/shared/encryption/encryption.service';
import { GetUser, GetClientId } from 'src/decorators';
import { User } from '@prisma/client';
import { RequireFeature } from '../plans/decorators/require-feature.decorator';

@Controller('canva')
@RequireFeature('canva')
export class CanvaController {
  constructor(
    private readonly canvaService: CanvaService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * POST /canva/designs
   * Creates a new blank 1080×1080 design and returns the editor URL + design ID.
   */
  @Post('designs')
  async createDesign(
    @GetUser() user: User,
    @GetClientId() clientId: string,
  ): Promise<{ editUrl: string; designId: string }> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId: user.id, clientId, platform: 'CANVA', isActive: true },
    });

    if (!account?.accessToken) {
      throw new NotFoundException('No connected Canva account found');
    }

    const accessToken = this.encryptionService.decrypt(account.accessToken)!;
    const { editUrl, designId } = await this.canvaService.createDesign(accessToken);

    return { editUrl, designId };
  }

  /**
   * POST /canva/designs/:designId/export
   * Exports a design as PNG and returns the download URL + dimensions.
   */
  @Post('designs/:designId/export')
  async exportDesign(
    @Param('designId') designId: string,
    @GetUser() user: User,
    @GetClientId() clientId: string,
  ): Promise<CanvaExportResult> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId: user.id, clientId, platform: 'CANVA', isActive: true },
    });

    if (!account?.accessToken) {
      throw new NotFoundException('No connected Canva account found');
    }

    const accessToken = this.encryptionService.decrypt(account.accessToken)!;
    return this.canvaService.exportDesign(accessToken, designId);
  }
}
