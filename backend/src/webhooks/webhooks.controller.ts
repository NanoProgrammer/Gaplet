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
    const provider = providerParam.trim().toLowerCase();
    const allowed = ['acuity', 'square'];
    if (!allowed.includes(provider)) {
      console.warn(`⚠️ Unknown provider: ${providerParam}`);
      return { received: true };
    }

    // Use rawBody populated by bodyParser.verify
    const rawBody = (req as any).rawBody?.toString('utf8') ?? '';
    if (provider === 'acuity' && !rawBody) {
      console.error('⚠️ Empty rawBody for Acuity');
      return { received: true };
    }

    let payload: any;
    try {
      if (provider === 'acuity') {
        // Parse form-urlencoded rawBody
        const params = new URLSearchParams(rawBody);
        payload = {
          action: params.get('action') || params.get('status'),
          id: params.get('id'),
        };
      } else if (provider === 'square') {
        // Square JSON via rawBody
        if (!rawBody) {
          console.warn('⚠️ Empty rawBody for Square');
          throw new BadRequestException('Missing rawBody');
        }
        payload = JSON.parse(rawBody);
      }
    } catch (err) {
      console.error('❌ Parsing webhook failed:', err);
      throw new BadRequestException('Invalid body');
    }

    if (provider === 'acuity') {
      const action = payload.action?.toLowerCase() ?? '';
      if (!action.includes('cancel')) {
        console.log('ℹ️ Non-cancel action:', payload.action);
        return { received: true };
      }

      const integration = await this.prisma.connectedIntegration.findFirst({ where: { provider: 'acuity' } });
      if (!integration?.accessToken) {
        console.error('⚠️ No Acuity token');
        return { received: true };
      }

      // Fetch via v2 API
      const appointmentId = payload.id;
      const url = `https://acuityscheduling.com/api/v2/appointments/${appointmentId}`;
      let details: any;
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${integration.accessToken}` },
        });
        if (!res.ok) throw new Error(`Acuity v2 ${res.status}`);
        details = await res.json();
      } catch (err) {
        console.error('❌ Acuity v2 error:', err);
        return { received: true };
      }

      const appt = details.appointment;
      const startAt = new Date(appt.datetime);
      const duration = appt.duration;

      const [, slot] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: integration.userId },
          data: { totalCancellations: { increment: 1 }, lastCancellationAt: new Date() },
        }),
        this.prisma.openSlot.create({ data: {
            gapletSlotId: crypto.randomUUID(),
            provider: 'acuity',
            providerBookingId: appt.id,
            userId: integration.userId,
            startAt,
            durationMinutes: duration,
            teamMemberId: appt.staffID ?? 'unknown',
            serviceVariationId: appt.appointmentTypeID ?? 'unknown',
            locationId: appt.locationId ?? 'unknown',
        }}),
      ]);

      await this.notificationService.startCampaign('acuity', integration, appt, slot.gapletSlotId);

    } else if (provider === 'square') {
      // Square
      const signature = headers['x-square-hmacsha256-signature'];
      const expected = crypto.createHmac('sha256', process.env.WEBHOOK_SQUARE_KEY)
        .update(`${process.env.API_BASE_URL}/webhooks/square` + rawBody).digest('base64');
      if (signature !== expected) throw new BadRequestException('Invalid signature');

      const booking = payload.data?.object?.booking;
      const status = booking?.status;
      if ((payload.type === 'booking.updated' || payload.type === 'appointments.cancelled') && status === 'CANCELLED_BY_SELLER') {
        const integration = await this.prisma.connectedIntegration.findFirst({ where: { provider: 'square', externalUserId: payload.merchant_id }});
        if (integration) {
          const startAt = new Date(booking.start_at);
          const [, slot] = await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: integration.userId }, data: { totalCancellations: { increment: 1 }, lastCancellationAt: new Date() } }),
            this.prisma.openSlot.create({ data: {
                gapletSlotId: crypto.randomUUID(),
                provider: 'square',
                providerBookingId: booking.id,
                userId: integration.userId,
                startAt,
                durationMinutes: booking.appointment_segments[0]?.duration_minutes ?? 60,
                teamMemberId: booking.appointment_segments[0]?.team_member_id ?? 'unknown',
                serviceVariationId: booking.appointment_segments[0]?.service_variation_id ?? 'unknown',
                locationId: booking.location_id,
            }}),
          ]);
          await this.notificationService.startCampaign('square', integration, { booking }, slot.gapletSlotId);
        }
      }

    } else {
      // Fallback: should never happen
      console.warn(`⚠️ Unhandled provider branch for: ${providerParam}`);
    }

    return { received: true };
  }
}
