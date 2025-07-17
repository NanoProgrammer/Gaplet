import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { PrismaManagerModule } from 'src/prisma-manager/prisma.module';

@Module({
  imports: [ConfigModule, PassportModule, PrismaManagerModule],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
