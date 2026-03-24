import { Module } from '@nestjs/common';
import { CanvaService } from './canva.service';
import { CanvaController } from './canva.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CanvaController],
  providers: [CanvaService, PrismaService],
  exports: [CanvaService],
})
export class CanvaModule {}
