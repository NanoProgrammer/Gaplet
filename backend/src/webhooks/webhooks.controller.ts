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
    console.log('🔥 [email-response] hit!', JSON.stringify(body));

    // Cabeceras obligatorias
    const fromEmail: string = body.from || body['envelope[from]'];
    const toEmailRaw = Array.isArray(body.to) ? body.to[0] : body.to || body['envelope[to]'];
    const toEmail: string = typeof toEmailRaw === 'string' ? toEmailRaw : '';
    if (!fromEmail || !toEmail) {
      return res.status(400).send({ error: 'Missing email headers' });
    }

    // 1) Extraer sólo texto plano del usuario
    let rawText = body.text || body.plain || '';
    if (!rawText && body.html) {
      rawText = body.html.replace(/<[^>]+>/g, '');
    }

    // 2) Quitar citas (> y On ... wrote:)
    const lines = rawText.split(/\r?\n/);
    const replyLines: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('>') || /^On .* wrote:/.test(t)) {
        break;
      }
      if (t) replyLines.push(t);
    }
    const replyContent = replyLines.join(' ');

    // 3) Normalizar y validar
    const normalized = replyContent.replace(/\s+/g, '').toLowerCase();
    const isTakeIt = normalized.includes('iwilltakeit');
    const isYes    = normalized.includes('yes');

    if (!isTakeIt && !isYes) {
      console.log('⚠️ No valid reply detected, skipping any action.');
      // No enviar nada si no cumple validación
      return res.status(200).end();
    }

    // 4) Procesar respuesta válida
    try {
      await this.notificationService.handleEmailReply(fromEmail, toEmail, replyContent);
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
        text.includes('yes') ;
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
  @Post(':provider')
  @HttpCode(200)
  async handleWebhook(
    @Param('provider') providerParam: string,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    // Normalize provider to lowercase
    const provider = providerParam.toLowerCase();
    const allowedProviders = ['square', 'acuity', 'calendly'];
    if (!allowedProviders.includes(provider)) {
      console.warn(`⚠️ Webhook from unknown provider: ${providerParam}`);
      return { received: true };
    }

    const isSquare = provider === 'square';
    const isAcuity = provider === 'acuity';
    const rawBody = Buffer.isBuffer((req as any).body)
      ? (req as any).body.toString('utf8')
      : '';

    if (isSquare && !rawBody) {
      console.warn('⚠️ rawBody is missing for Square webhook');
      throw new BadRequestException('Missing rawBody');
    }

    let body: any;
    try {
      if (isAcuity) {
        // Parse urlencoded form
        const params = new URLSearchParams(rawBody);
        body = {
          action: params.get('action') || params.get('status'),
          id: params.get('id'),
          staffID: params.get('staffID'),
          appointmentTypeID: params.get('appointmentTypeID'),
        };
      } else {
        body = isSquare ? JSON.parse(rawBody) : req.body;
      }
    } catch {
      throw new BadRequestException('Invalid body format');
    }

    if (isAcuity && body.action?.includes('cancel')) {
      const integration = await this.prisma.connectedIntegration.findFirst({
        where: { provider: 'acuity' },
      });
      if (!integration?.accessToken) {
        console.error('⚠️ No Acuity accessToken found');
        return { received: true };
      }

      const appointmentId = body.id;
      const basicAuth = Buffer.from(`${integration.accessToken}:`).toString('base64');
      const url = `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`;
      let details: any;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Accept': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`Acuity API v1 responded ${response.status}`);
        }
        details = await response.json();
      } catch (error) {
        console.error('❌ Error fetching Acuity appointment details', error);
        return { received: true };
      }

      const appt = details.appointment;
      const appointmentTime = new Date(appt.datetime);
      const duration = appt.duration;

      const [, openSlot] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: integration.userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        }),
        this.prisma.openSlot.create({
          data: {
            gapletSlotId: crypto.randomUUID(),
            provider: 'acuity',
            providerBookingId: appt.id,
            userId: integration.userId,
            startAt: appointmentTime,
            durationMinutes: duration,
            teamMemberId: body.staffID || 'unknown',
            serviceVariationId: body.appointmentTypeID || 'unknown',
            locationId: 'acuity_location',
          },
        }),
      ]);

      await this.notificationService.startCampaign(
        'acuity',
        integration,
        {
          appointmentId: appt.id,
          appointmentTypeID: body.appointmentTypeID,
          datetime: appt.datetime,
          firstName: appt.firstName,
          lastName: appt.lastName,
          email: appt.email,
        },
        openSlot.gapletSlotId,
      );
    }
    if (isSquare) {
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
      if ((eventType === 'booking.updated' || eventType === 'appointments.cancelled') && booking?.status === 'CANCELLED_BY_SELLER') {
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'square', externalUserId: body.merchant_id },
        });
        if (!integration) return { received: true };

        const appointmentTime = new Date(booking.start_at);
        const [, openSlot] = await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: integration.userId },
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
              userId: integration.userId,
              startAt: appointmentTime,
              durationMinutes: booking.appointment_segments?.[0]?.duration_minutes || 60,
              teamMemberId: booking.appointment_segments?.[0]?.team_member_id || 'unknown',
              serviceVariationId: booking.appointment_segments?.[0]?.service_variation_id || 'unknown',
              locationId: booking.location_id,
            },
          }),
        ]);

        await this.notificationService.startCampaign('square', integration, { booking }, openSlot.gapletSlotId);
      }

    // UNKNOWN PROVIDER
    } else {
      console.warn(`⚠️ Webhook from unknown provider: ${provider}`);
    }

    return { received: true };
  }
  
}
