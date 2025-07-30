import { 
  Controller, Post, Param, Headers, HttpCode, BadRequestException, Req, UseInterceptors, Res 
} from '@nestjs/common';
import * as multer from 'multer';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
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

 
// 1) Controller: pasamos además el Message‑ID como cuarto parámetro
@Post('email-response')
@HttpCode(200)
@UseInterceptors(AnyFilesInterceptor(multerOptions))
async handleEmailResponse(@Req() req: Request, @Res() res: Response) {
  const body: any = req.body;
  console.log('🔥 [email-response] hit!', JSON.stringify(body));   // <<< nueva línea
  const fromEmail: string = body.from || body['envelope[from]'];
  const toEmailRaw   = Array.isArray(body.to) ? body.to[0] : body.to || body['envelope[to]'];
  const toEmail: string= typeof toEmailRaw === 'string' ? toEmailRaw : '';
  const emailText: string = body.text || body.plain || body.html || '';

  console.log('📩 Webhook from email-response', { fromEmail, toEmail });

  if (!fromEmail || !toEmail) {
    return res.status(400).send({ error: 'Missing email headers' });
  }

  try {
    await this.notificationService.handleEmailReply(fromEmail, toEmail, emailText);
    return res.status(200).send({ message: 'Reply processed successfully' });
  } catch (err) {
    console.error('❌ Error handling email reply:', err);
    return res.status(500).send({ error: 'Internal server error' });
  }
}



  @Post('sms-response')
  async handleSmsResponse(@Req() req: Request, @Res() res: Response) {
    const body: any = req.body;
    const fromPhone: string = body.From;
    const smsText: string = body.Body || '';
    console.log('📱 SMS response received', { fromPhone, smsText });
    if (fromPhone && smsText) {
      // Procesar la respuesta SMS entrante
      await this.notificationService.handleSmsReply(fromPhone, smsText);
      // Si la respuesta SMS es afirmativa (ej. "Sí" o "yes"), actualizar métricas (el NotificationService se encarga del resto)
      const text = smsText.toLowerCase();
      const positiveReply =
        text.includes('yes') || text.includes('sí') || text.includes('si');
      if (positiveReply) {
        // Buscar alguna integración activa (priorizar Square, luego Acuity)
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
    // Respuesta vacía XML para confirmar recepción al servicio SMS (Twilio)
    res.type('text/xml').send('<Response></Response>');
  }
   @Post(':provider')
  @HttpCode(200)
  async handleWebhook(
    @Param('provider') provider: 'calendly' | 'acuity' | 'square',
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const allowedProviders = ['square', 'acuity', 'calendly'];
  if (!allowedProviders.includes(provider)) {
    console.warn(`❌ Ignoring unknown provider webhook: ${provider}`);
    throw new BadRequestException('Unknown webhook provider');
  }
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
      if (body.status === 'canceled' || body.action === 'canceled') {
        // Buscar la integración Acuity activa
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'acuity' },
        });
        if (!integration) return { received: true };
        const userId = integration.userId;
        // Registrar cancelación y crear OpenSlot en base de datos
        const appointmentTime = new Date(body.datetime);
        const [updatedUser, openSlot] = await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: userId },
            data: {
              totalCancellations: { increment: 1 },
              lastCancellationAt: new Date(),
            },
          }),
          this.prisma.openSlot.create({
            data: {
              gapletSlotId: crypto.randomUUID(),
              provider: 'acuity',
              providerBookingId: body.id,
              userId,
              startAt: appointmentTime,
              durationMinutes: body.duration || 30,
              teamMemberId: body.staffID?.toString() || 'unknown',
              serviceVariationId: body.appointmentTypeID?.toString() || 'unknown',
              locationId: 'acuity_location', // Ajustar si hay información de ubicación real
            },
          }),
        ]);
        // Iniciar campaña de notificaciones para este hueco cancelado
        await this.notificationService.startCampaign('acuity', integration, {
          appointmentId: body.id,
          appointmentTypeID: body.appointmentTypeID || body.appointmentTypeId,
          datetime: body.datetime,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
        }, openSlot.gapletSlotId);
      }
    } else if (isSquare) {
      const signature = headers['x-square-hmacsha256-signature'];
      const signatureKey = process.env.WEBHOOK_SQUARE_KEY;
      const fullUrl = `${process.env.API_BASE_URL}/webhooks/square`;
      const payloadToSign = fullUrl + rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', signatureKey)
        .update(payloadToSign)
        .digest('base64');

      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid Square signature');
      }

      const eventType = body.type;
      const booking = body.data?.object?.booking;

      if (
        (eventType === 'booking.updated' || eventType === 'appointments.cancelled') &&
        booking?.status === 'CANCELLED_BY_SELLER'
      ) {
        // Buscar integración Square correspondiente al merchant
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'square', externalUserId: body.merchant_id },
        });
        if (!integration) return { received: true };
        const userId = integration.userId;
        // Registrar cancelación y crear OpenSlot en base de datos
        
        const appointmentTime = new Date(booking.start_at);
        const [updatedUser, openSlot] = await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: userId },
            data: {
              totalCancellations: { increment: 1 },
              lastCancellationAt: new Date(),
            },
          }),
          this.prisma.openSlot.create({
            data: {
              gapletSlotId: crypto.randomUUID(),
              provider: 'square',
              providerBookingId: booking.id,
              userId,
              startAt: appointmentTime,
              durationMinutes: booking.appointment_segments?.[0]?.duration_minutes || 60,
              teamMemberId: booking.appointment_segments?.[0]?.team_member_id || 'unknown',
              serviceVariationId: booking.appointment_segments?.[0]?.service_variation_id || 'unknown',
              locationId: booking.location_id,
            },
          }),
        ]);
        // Iniciar campaña de notificaciones para este hueco cancelado
        await this.notificationService.startCampaign('square', integration, { booking }, openSlot.gapletSlotId);
      }
    } else {
      console.warn(`⚠️ Webhook from unknown provider: ${provider}`);
    }

    return { received: true };
  }

}
