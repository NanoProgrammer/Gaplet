import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PrismaManagerService } from 'src/prisma-manager/prisma-manager.service';
import { NotificationService } from './webhook.service';

@Module({
  controllers: [WebhooksController],
  providers: [PrismaManagerService, NotificationService],
})
export class WebhooksModule {}
