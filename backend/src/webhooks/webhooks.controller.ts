import {
  Controller,
  Post,
  Param,
  Headers,
  HttpCode,
  BadRequestException,
  Req,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import * as multer from 'multer';
import { AnyFilesInterceptor  } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { NotificationService } from './webhook.service';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';

const storage = multer.memoryStorage();
const multerOptions = {
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaManagerService,
  ) {}

  @Post('email-response')
  @HttpCode(200)
  @UseInterceptors(AnyFilesInterceptor(multerOptions))
  async handleEmailResponse(@Req() req: Request, @Res() res: Response) {
    const body: any = req.body;
    const fromEmail: string = body.from || body['envelope[from]'];
    const toEmail: string = Array.isArray(body.to)
      ? body.to[0]
      : body.to || body['envelope[to]'];
    const emailText: string = body.text || body.plain || body.html || '';
    const originalSubject: string = body.subject || '';

    console.log('📩 Webhook from email-response', { fromEmail, toEmail, emailText });
    if (fromEmail && toEmail) {
      // Process the email reply and handle booking or responses
      await this.notificationService.handleEmailReply(fromEmail, toEmail, emailText, originalSubject);
      console.log('📧 Email response handled');
      // (Metrics updates are handled within handleEmailReply on successful booking)
    }
    return res.status(200).send({ received: true });
  }

  @Post('sms-response')
  async handleSmsResponse(@Req() req: Request, @Res() res: Response) {
    const body: any = req.body;
    const fromPhone: string = body.From;
    const smsText: string = body.Body || '';
    console.log('📱 SMS response received', { fromPhone, smsText });
    if (fromPhone && smsText) {
      // Process the SMS response
      await this.notificationService.handleSmsReply(fromPhone, smsText);
      // Check for a positive confirmation in SMS (e.g., client responded "Yes" or "Sí")
      const text = smsText.toLowerCase();
      const positiveReply =
        text.includes('yes') || text.includes('sí') || text.includes('si');
      if (positiveReply) {
        // Find an integration (Square or Acuity) to update metrics
        let integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'square' },
        });
        if (!integration) {
          integration = await this.prisma.connectedIntegration.findFirst({
            where: { provider: 'acuity' },
          });
        }
        if (integration) {
          const userId = integration.userId;
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              totalReplacements: { increment: 1 },
              lastReplacementAt: new Date(),
            },
          });
        }
      }
    }
    // Respond with empty TwiML to acknowledge SMS
    res.type('text/xml').send('<Response></Response>');
  }

  @Post(':provider')
  @HttpCode(200)
  async handleWebhook(
    @Param('provider') provider: 'calendly' | 'acuity' | 'square',
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const isSquare = provider === 'square';
    const rawBody = (req as any).body instanceof Buffer
      ? (req as any).body.toString('utf8')
      : '';

    if (isSquare && !rawBody) {
      console.warn('⚠️ rawBody is missing for Square webhook');
      throw new BadRequestException('Missing rawBody');
    }

    let body: any;
    try {
      body = isSquare ? JSON.parse(rawBody) : req.body;
    } catch (e) {
      throw new BadRequestException('Invalid JSON body');
    }

    console.log(`📩 Webhook from ${provider}`, { headers, body });

    if (provider === 'acuity') {
      // Handle Acuity appointment cancellations
      if (body.status === 'canceled' || body.action === 'canceled') {
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'acuity' },
        });
        if (!integration) return { received: true };
        const userId = integration.userId;
        // Increment cancellations count and update lastCancellationAt
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        // Start a notification campaign for the newly opened slot
        await this.notificationService.startCampaign('acuity', integration, {
          appointmentId: body.id,
          appointmentTypeID: body.appointmentTypeID || body.appointmentTypeId,
          datetime: body.datetime,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
        });
      }
    } else if (isSquare) {
      // Verify HMAC signature for Square webhooks
      const signature = headers['x-square-hmacsha256-signature'];
      const signatureKey = process.env.WEBHOOK_SQUARE_KEY;
      const fullUrl = `${process.env.API_BASE_URL}/webhooks/square`;
      const payloadToSign = fullUrl + rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', signatureKey)
        .update(payloadToSign)
        .digest('base64');

      console.log('🔐 Full URL:', fullUrl);
      console.log('📦 Raw body:', rawBody);
      console.log('🔐 Expected:', expectedSignature);
      console.log('🔐 Received:', signature);

      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid Square signature');
      }

      const eventType = body.type;
      const eventObj = body.data?.object;
      if (
        eventType === 'booking.updated' ||
        eventType === 'appointments.cancelled'
      ) {
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'square', externalUserId: body.merchant_id },
        });
        if (!integration) return { received: true };
        const userId = integration.userId;
        // Increment cancellations count and update lastCancellationAt
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        // Start a notification campaign for the newly opened slot (pass the booking info directly)
        const booking = eventObj?.booking;
        await this.notificationService.startCampaign('square', integration, { booking });
      }
    } else {
      console.warn(`⚠️ Webhook from unknown provider: ${provider}`);
    }

    return { received: true };
  }
}

