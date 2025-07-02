import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaManagerService } from 'src/prisma-manager/prisma-manager.service';
import { JwtModule } from '@nestjs/jwt';
import { GoogleStrategy } from './strategy';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PrismaManagerService, GoogleStrategy],
})
export class AuthModule {}
