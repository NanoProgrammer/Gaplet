import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaManagerService } from './prisma-manager/prisma-manager.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { JwtRefreshStrategy, JwtStrategy } from './auth/strategy';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentsModule } from './payments/payments.module';

import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    ConfigModule.forRoot({ isGlobal: true }),
    CheckoutModule,
    PaymentsModule,
    WebhooksModule,
  ],
  controllers: [],
  providers: [PrismaManagerService, JwtStrategy, JwtRefreshStrategy],
})
export class AppModule {}
