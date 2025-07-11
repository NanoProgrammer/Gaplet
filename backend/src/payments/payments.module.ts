import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule, // Para usar process.env.STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET
    UserModule, // Para poder usar UserService y updateUserRole
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
