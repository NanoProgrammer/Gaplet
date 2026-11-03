import { Module } from '@nestjs/common';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { JwtModule } from '@nestjs/jwt';
import { ConnectorsController, InboundHooksController, OAuthCallbackController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';

@Module({
  imports: [WebhooksModule, JwtModule.register({})],
  controllers: [ConnectorsController, OAuthCallbackController, InboundHooksController],
  providers: [PrismaManagerService, ConnectorsService],
})
export class ConnectorsModule {}
