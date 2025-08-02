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
  async handleWebhook(
    @Param('provider') providerParam: string,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    // Normalize provider
    const provider = decodeURIComponent(providerParam).trim().toLowerCase();
    const allowedProviders = ['acuity', 'square']; // only support Acuity & Square
    if (!allowedProviders.includes(provider)) {
      console.warn(`⚠️ Webhook from unknown provider: ${providerParam}`);
      return { received: true };
    }

    // Read raw body for parsing and signature
    const rawBody = Buffer.isBuffer((req as any).body)
      ? (req as any).body.toString('utf8')
      : '';

    let payload: any;
    try {
      if (provider === 'acuity') {
        // Acuity sends application/x-www-form-urlencoded
        const params = new URLSearchParams(rawBody);
        payload = {
          action: params.get('action') || params.get('status'),
          id: params.get('id'),
          staffID: params.get('staffID'),
          appointmentTypeID: params.get('appointmentTypeID'),
        };
      } else {
        // Square sends JSON
        if (!rawBody) {
          console.warn('⚠️ rawBody is missing for Square webhook');
          throw new BadRequestException('Missing rawBody');
        }
        payload = JSON.parse(rawBody);
      }
    } catch (err) {
      console.error('❌ Error parsing webhook body:', err);
      throw new BadRequestException('Invalid webhook body');
    }

    if (provider === 'acuity') {
      // Only process cancellations
      if (!payload.action?.toLowerCase().includes('cancel')) {
        console.log('ℹ️ Ignoring non-cancel Acuity action:', payload.action);
        return { received: true };
      }

      // Fetch integration
      const integration = await this.prisma.connectedIntegration.findFirst({ where: { provider: 'acuity' } });
      if (!integration?.accessToken) {
        console.error('⚠️ No Acuity accessToken found');
        return { received: true };
      }

      // Fetch appointment via Acuity v1 API
      const appointmentId = payload.id;
      const basicAuth = Buffer.from(`${integration.accessToken}:`).toString('base64');
      const apiUrl = `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`;
      let details: any;
      try {
        const res = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Accept': 'application/json',
          },
        });
        if (!res.ok) throw new Error(`Acuity API responded ${res.status}`);
        details = await res.json();
      } catch (error) {
        console.error('❌ Error fetching Acuity appointment:', error);
        return { received: true };
      }

      const appt = details.appointment;
      const appointmentTime = new Date(appt.datetime);
      const duration = appt.duration;

      // Record cancellation and open slot
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
            teamMemberId: payload.staffID || 'unknown',
            serviceVariationId: payload.appointmentTypeID || 'unknown',
            locationId: 'acuity_location',
          },
        }),
      ]);

      // Trigger notification campaign
      await this.notificationService.startCampaign(
        'acuity',
        integration,
        {
          appointmentId: appt.id,
          appointmentTypeID: payload.appointmentTypeID,
          datetime: appt.datetime,
          firstName: appt.firstName,
          lastName: appt.lastName,
          email: appt.email,
        },
        openSlot.gapletSlotId,
      );

    } else if (provider === 'square') {
      // Validate Square signature
      const signature = headers['x-square-hmacsha256-signature'];
      const signatureKey = process.env.WEBHOOK_SQUARE_KEY;
      const fullUrl = `${process.env.API_BASE_URL}/webhooks/square`;
      const signed = crypto.createHmac('sha256', signatureKey).update(fullUrl + rawBody).digest('base64');
      if (signature !== signed) {
        throw new BadRequestException('Invalid Square signature');
      }

      const eventType = payload.type;
      const booking = payload.data?.object?.booking;
      if ((eventType === 'booking.updated' || eventType === 'appointments.cancelled') && booking?.status === 'CANCELLED_BY_SELLER') {
        const integration = await this.prisma.connectedIntegration.findFirst({ where: { provider: 'square', externalUserId: payload.merchant_id } });
        if (!integration) return { received: true };

        const appointmentTime = new Date(booking.start_at);
        const [, openSlot] = await this.prisma.$transaction([
          this.prisma.user.update({ where: { id: integration.userId }, data: { totalCancellations: { increment: 1 }, lastCancellationAt: new Date() } }),
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
    }

    return { received: true };
  }
  
}
