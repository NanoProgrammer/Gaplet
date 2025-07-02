import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaManagerService } from './prisma-manager/prisma-manager.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { JwtRefreshStrategy, JwtStrategy } from './auth/strategy';


@Module({
  imports: [AuthModule, UserModule,ConfigModule.forRoot({isGlobal: true})],
  controllers: [],
  providers: [PrismaManagerService, JwtStrategy, JwtRefreshStrategy],
})
export class AppModule {}
