import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [ConfigModule, PassportModule],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
