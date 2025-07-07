import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaManagerService } from 'src/prisma-manager/prisma-manager.service';

@Module({
  
  controllers: [UserController],
  providers: [UserService, PrismaManagerService],
  exports: [UserService],
})
export class UserModule {}
