import { Controller, Post, Param, Headers, HttpCode, BadRequestException, Req, Res } from '@nestjs/common';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { NotificationService } from './webhook.service';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaManagerService,
  ) {}

  @Post(':provider')
  @HttpCode(200)
  async handleWebhook(
    @Param('provider') provider: 'calendly' | 'acuity' | 'square',
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const rawBody = (req as any).body?.toString?.();
    if (!rawBody) {
      console.warn('⚠️ rawBody is missing for Square webhook');
      throw new BadRequestException('Missing rawBody');
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      throw new BadRequestException('Invalid JSON body');
    }

    console.log(`📩 Webhook from ${provider}`, { headers, body });

    if (provider === 'acuity') {
      const acuitySignature = headers['x-acuity-signature'];
      if (body.status === 'canceled' || body.action === 'canceled') {
        const integration = await this.prisma.connectedIntegration.findFirst({ where: { provider: 'acuity' } });
        if (!integration) return { received: true };
        const userId = integration.userId;
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        await this.notificationService.startCampaign('acuity', integration, {
          appointmentId: body.id,
          appointmentTypeID: body.appointmentTypeID || body.appointmentTypeId,
          datetime: body.datetime,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
        });
      }
    } else if (provider === 'square') {
      const signature = headers['x-square-hmacsha256-signature'];
      const secret = process.env.WEBHOOK_SQUARE_KEY;
      const fullUrl = `${process.env.API_BASE_URL}/webhooks/square`;
      const payloadToSign = fullUrl + rawBody;

      const expectedSignature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('base64');

      console.log('🔐 Full URL:', fullUrl);
      console.log('📦 Raw body:', rawBody);
      console.log('🔐 Expected:', expectedSignature);
      console.log('🔐 Received:', signature);

      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid Square signature');
      }

      const eventType = body.type;
      const eventObj = body.data?.object;
      if (eventType === 'booking.updated' || eventType === 'appointments.cancelled') {
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'square', externalUserId: body.merchant_id },
        });
        if (!integration) return { received: true };
        const userId = integration.userId;
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        const bookingId = eventObj?.booking_id || eventObj?.id;
        await this.notificationService.startCampaign('square', integration, { bookingId });
      }
    } else {
      console.warn(`⚠️ Webhook from unknown provider: ${provider}`);
    }

    return { received: true };
  }

  @Post('email-response')
  @HttpCode(200)
  async handleEmailResponse(@Req() req: Request) {
    const body: any = req.body;
    const fromEmail: string = body.from || body.envelope?.from;
    const toEmail: string = Array.isArray(body.to) ? body.to[0] : (body.to || body.envelope?.to);
    const emailText: string = body.text || body.plain || '';
    if (fromEmail && toEmail) {
      await this.notificationService.handleEmailReply(fromEmail, toEmail, emailText);
    }
    return { received: true };
  }

  @Post('sms-response')
  async handleSmsResponse(@Req() req: Request, @Res() res: Response) {
    const body: any = req.body;
    const fromPhone: string = body.From;
    const toPhone: string = body.To;
    const smsText: string = body.Body || '';
    if (fromPhone && smsText) {
      await this.notificationService.handleSmsReply(fromPhone, smsText);
    }
    res.type('text/xml').send('<Response></Response>');
  }
}
