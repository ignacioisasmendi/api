import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [InstagramController],
  providers: [InstagramService, PrismaService],
  exports: [InstagramService],
})
export class InstagramModule {}
