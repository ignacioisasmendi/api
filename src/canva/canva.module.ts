import { Module } from '@nestjs/common';
import { CanvaService } from './canva.service';
import { CanvaController } from './canva.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/shared/encryption/encryption.service';

@Module({
  controllers: [CanvaController],
  providers: [CanvaService, PrismaService, EncryptionService],
  exports: [CanvaService],
})
export class CanvaModule {}
