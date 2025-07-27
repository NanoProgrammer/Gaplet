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
      // Manejo de cancelación de Acuity
      if (body.status === 'canceled' || body.action === 'canceled') {
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'acuity' },
        });
        if (!integration) return { received: true };
        const userId = integration.userId;
        // Incrementar cancelaciones y actualizar última cancelación
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        // Iniciar campaña usando datos del webhook de Acuity
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
      // Verificación de firma HMAC para Square
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
        // Incrementar cancelaciones y actualizar última cancelación
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        // Obtener el ID de reserva correctamente desde el objeto booking del webhook
        const booking = eventObj?.booking;
        const bookingId = booking?.id;
        // Iniciar campaña usando el objeto completo de la reserva (sin fetch adicional a Square)
        await this.notificationService.startCampaign('square', integration, { booking });
      }
    } else {
      console.warn(`⚠️ Webhook from unknown provider: ${provider}`);
    }

    return { received: true };
  }

  

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

    console.log('📩 Webhook from email-response', { fromEmail, toEmail, emailText });

    if (fromEmail && toEmail) {
      // Procesar respuesta del email...
      await this.notificationService.handleEmailReply(fromEmail, toEmail, emailText);
      console.log('📧 Email response handled');

      // Si la respuesta es positiva (contiene "yes"/"sí"), actualizar métricas...
      const textLower = emailText.toLowerCase();
      const positiveReply =
        textLower.includes('yes') || textLower.includes('sí') || textLower.includes('si');
      if (positiveReply) {
        // Buscar integración (Square o Acuity) para incrementar reemplazos
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

    return res.status(200).send({ received: true });
  }

  @Post('sms-response')
  async handleSmsResponse(@Req() req: Request, @Res() res: Response) {
    const body: any = req.body;
    const fromPhone: string = body.From;
    const smsText: string = body.Body || '';
    console.log('📱 SMS response received', { fromPhone, smsText });
    if (fromPhone && smsText) {
      // Procesar la respuesta SMS
      await this.notificationService.handleSmsReply(fromPhone, smsText);
      // Verificar respuesta positiva en el SMS (ej. cliente respondió "Sí")
      const text = smsText.toLowerCase();
      const positiveReply =
        text.includes('yes') || text.includes('sí') || text.includes('si');
      if (positiveReply) {
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
    // Respuesta vacía para confirmar recepción al servicio SMS
    res.type('text/xml').send('<Response></Response>');
  }
}
