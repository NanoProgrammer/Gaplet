import { Module } from '@nestjs/common';
import { PrismaManagerController } from './prisma-manager.controller';
import { PrismaManagerService } from './prisma-manager.service';

@Module({
  imports: [],
  controllers: [PrismaManagerController],
  providers: [PrismaManagerService],
  exports: [PrismaManagerService],
})
export class PrismaManagerModule {}
