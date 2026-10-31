import { Module } from '@nestjs/common';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ConnectorsController, InboundHooksController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';

@Module({
  imports: [WebhooksModule],
  controllers: [ConnectorsController, InboundHooksController],
  providers: [PrismaManagerService, ConnectorsService],
})
export class ConnectorsModule {}
