import { Module } from '@nestjs/common';
import { PrismaManagerController } from './prisma-manager.controller';


@Module({
  imports: [],
  controllers: [PrismaManagerController],
  providers: [],
})
export class AppModule {}
