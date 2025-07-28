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

  @Post('email-response')
@HttpCode(200)
@UseInterceptors(AnyFilesInterceptor(multerOptions))
async handleEmailResponse(@Req() req: Request, @Res() res: Response) {
  const body: any = req.body;
  const fromEmail: string = body.from || body['envelope[from]'];
  const toEmail: string = Array.isArray(body.to) ? body.to[0] : body.to || body['envelope[to]'];
  const emailText: string = body.text || body.plain || body.html || '';
  
  console.log('📩 Webhook from email-response', { fromEmail, toEmail });
  
  if (fromEmail && toEmail) {
    // Normalize the email text and check for acceptance phrases
    const textLower = emailText.toLowerCase();
    const accepted = textLower.includes('i will take it') || textLower.includes('yes') || textLower.includes('sí');
    console.log('📝 Incoming email text (lowercased):', textLower);
    console.log('✅ Contains confirmation phrase?', accepted);
    
    // Extract the slot (campaign) ID from the reply-to address.
    // The local part of the email (before @) is expected to be the unique gapletSlotId or campaignId.
    let gapletSlotId: string | null = null;
    if (toEmail) {
      const localPart = toEmail.split('@')[0];
      gapletSlotId = localPart.startsWith('reply+') ? localPart.slice('reply+'.length) : localPart;
    }
    console.log('🔍 Extracted gapletSlotId from reply email:', gapletSlotId);
    
    if (accepted && gapletSlotId) {
      // This is a positive confirmation for a specific slot
      const slot = await this.prisma.openSlot.findUnique({ where: { gapletSlotId } });
      if (!slot) {
        console.warn(`❌ Slot with ID ${gapletSlotId} not found in database.`);
        return res.status(404).send({ error: 'Slot not found' });
      }
      
      if (slot.isTaken) {
        // Slot has already been claimed by someone else
        console.log(`⚠️ Slot ${gapletSlotId} already taken by another responder.`);
        // Prepare recipient info (if available in active campaign data) for a personalized apology
        let recipientInfo: any = null;
        const campaignId = this.notificationService.getCampaignIdBySlotId(gapletSlotId);
        if (campaignId) {
          const campaign = this.notificationService.getCampaign(campaignId);
          if (campaign) {
            recipientInfo = campaign.recipients.find(r => r.email?.toLowerCase() === fromEmail.toLowerCase());
          }
        }
        // Send "slot already filled" notification to this responder
        await this.notificationService.sendSlotAlreadyTakenEmail(fromEmail, recipientInfo);
        console.log(`📧 Sent slot-unavailable email to ${fromEmail}.`);
        return res.status(200).send({ message: 'Slot already taken' });
      }
      
      // Slot is available — this is the first responder. Proceed to book the appointment.
      console.log(`✅ Slot ${gapletSlotId} is available. Booking appointment for responder ${fromEmail}...`);
      const user = await this.prisma.user.findUnique({ where: { id: slot.userId } });
      if (!user) {
        console.error('❌ Associated user (business owner) not found for slot:', slot);
        return res.status(404).send({ error: 'User not found' });
      }
      const integration = await this.prisma.connectedIntegration.findFirst({
        where: { userId: user.id, provider: slot.provider },
      });
      if (!integration) {
        console.error(`❌ No integration found for provider '${slot.provider}' and user ${user.id}.`);
        return res.status(404).send({ error: 'Integration not found' });
      }
      
      // Build winner information (email, name, phone, customerId) from campaign data if available
      let winnerInfo: any = { email: fromEmail, name: '', phone: null, customerId: null };
      const campaignId = this.notificationService.getCampaignIdBySlotId(gapletSlotId);
      if (campaignId) {
        const campaign = this.notificationService.getCampaign(campaignId);
        if (campaign) {
          const foundRecipient = campaign.recipients.find(r => r.email?.toLowerCase() === fromEmail.toLowerCase());
          if (foundRecipient) {
            winnerInfo = { ...foundRecipient, email: fromEmail };
          }
        }
      }
      console.log('👤 Winner info for booking:', winnerInfo);
      
      try {
        console.log(`🔔 Creating appointment in ${slot.provider.toUpperCase()} for slot ${gapletSlotId}...`);
        // This will create the appointment, update DB (ReplacementLog, OpenSlot, user metrics), and send confirmation notification
        await this.notificationService.createAppointmentAndNotify(integration, winnerInfo, slot);
        console.log(`🎉 Appointment booked in ${slot.provider} for ${winnerInfo.email}. Confirmation sent.`);
      } catch (error) {
        console.error('❌ Error creating appointment or sending notifications:', error);
        console.warn(`⚠️ Slot ${gapletSlotId} booking failed or already filled by another.`);
        // If booking fails (e.g., race condition or API error), notify the client that the slot is not available
        await this.notificationService.sendSlotAlreadyTakenEmail(fromEmail, winnerInfo);
        console.log(`📧 Sent apology email to ${fromEmail} due to booking failure.`);
        // Mark the campaign as filled to prevent any further notifications for this slot
        if (campaignId) {
          this.notificationService.markCampaignFilled(campaignId);
        }
        return res.status(200).send({ message: 'Slot taken or booking failed' });
      }
      
      // Mark the notification campaign as filled to stop other notifications, if applicable
      if (campaignId) {
        this.notificationService.markCampaignFilled(campaignId);
      }
      console.log(`✅ Slot ${gapletSlotId} marked as filled and campaign closed.`);
    } else {
      // The email either did not contain a confirmation phrase or no slot ID was found.
      console.log('ℹ️ No valid confirmation phrase or slot ID. Forwarding to generic reply handler.');
      await this.notificationService.handleEmailReply(fromEmail, toEmail, emailText);
    }
    
    console.log('📧 Email response handling completed.');
  }
  
  // Respond with 200 OK to acknowledge receipt of the webhook
  return res.status(200).send({ received: true });
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
}
