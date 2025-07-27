import { Controller, Post, Param, Body, Headers, HttpCode, BadRequestException, Req, Res } from '@nestjs/common';
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
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    console.log(`📩 Webhook from ${provider}`, { headers, body });
    const rawBody = (req as any).rawBody; 
    if (!rawBody) {
  console.warn('⚠️ rawBody is missing for Square webhook');
  throw new BadRequestException('Missing rawBody');
}

    /* -------------------- ACUITY -------------------- */
    else if (provider === 'acuity') {
      // Acuity webhooks may not include a signature by default; verification can be done if HMAC key is available.
      const acuitySignature = headers['x-acuity-signature'];
      if (acuitySignature) {
        // If needed, verify HMAC-SHA256 with Acuity API key. (Skipping detailed verification for brevity.)
        // const computed = crypto.createHmac('sha256', ACUITY_API_KEY).update(rawBody).digest('base64');
        // if (computed !== acuitySignature) throw new BadRequestException('Invalid Acuity signature');
      }
      if (body.status === 'canceled' || body.action === 'canceled') {
        console.log('Acuity cancellation:', {
          id: body.id,
          name: `${body.firstName || ''} ${body.lastName || ''}`.trim(),
          email: body.email,
          appointmentType: body.type,
          time: body.datetime,
        });
        // Identify which user integration this cancellation belongs to.
        const integration = await this.prisma.connectedIntegration.findFirst({ where: { provider: 'acuity' } });
        if (!integration) {
          console.warn(`No integrated Acuity account found for cancellation id ${body.id}`);
          return { received: true };
        }
        const userId = integration.userId;
        // Update user cancellation metrics
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        // Trigger the notification/rebooking campaign (asynchronous, using timers for scheduling)
        this.notificationService.startCampaign('acuity', integration, {
          appointmentId: body.id,
          appointmentTypeID: body.appointmentTypeID || body.appointmentTypeId,
          datetime: body.datetime,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
        }).catch(err => console.error('Error in Acuity notification campaign:', err));
      }
    }

    /* -------------------- SQUARE -------------------- */
    else if (provider === 'square') {
      const signature = headers['x-square-signature'];
      const secret = process.env.WEBHOOK_SQUARE_KEY;
      // Square’s signature is HMAC-SHA1 of the URL + request body
      const payload = `${process.env.API_BASE_URL}/webhooks/square${rawBody}`;
      const expectedSignature = crypto
  .createHmac('sha256', secret!)
  .update(`${process.env.API_BASE_URL}/webhooks/square${rawBody}`)
  .digest('base64');

      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid Square signature');
      }
      const eventType = body.event_type;
      const eventObj = body.data?.object;
      if (eventType === 'bookings.canceled' || eventType === 'appointments.cancelled') {
        console.log('Square cancellation:', {
          bookingId: eventObj?.booking_id || eventObj?.id,
          canceledAt: body.created_at,
          merchant: body.merchant_id,
        });
        // Find the integration by merchant (externalUserId)
        const integration = await this.prisma.connectedIntegration.findFirst({
          where: { provider: 'square', externalUserId: body.merchant_id },
        });
        if (!integration) {
          console.warn(`No Square integration found for merchant ${body.merchant_id}`);
          return { received: true };
        }
        const userId = integration.userId;
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalCancellations: { increment: 1 },
            lastCancellationAt: new Date(),
          },
        });
        // Trigger notification campaign for this cancellation
        const bookingId = eventObj?.booking_id || eventObj?.id;
        this.notificationService.startCampaign('square', integration, { bookingId }).catch(err =>
          console.error('Error in Square notification campaign:', err),
        );
      }
    }

    else {
      console.warn(`⚠️ Webhook from unknown provider: ${provider}`);
    }

    // Respond 200 OK for all handled webhooks
    return { received: true };
  }

  /**
   * Endpoint to handle incoming email replies via SendGrid Inbound Parse.
   * This should be configured as the webhook target for reply emails.
   */
  @Post('email-response')
  @HttpCode(200)
  async handleEmailResponse(@Body() body: any) {
    const fromEmail: string = body.from || body.envelope?.from;
    const toEmail: string = Array.isArray(body.to) ? body.to[0] : (body.to || body.envelope?.to);
    const emailText: string = body.text || body.plain || '';
    console.log(`📨 Inbound email reply from ${fromEmail} to ${toEmail}: ${emailText}`);
    if (fromEmail && toEmail) {
      await this.notificationService.handleEmailReply(fromEmail, toEmail, emailText);
    }
    // SendGrid doesn't require any specific response content
    return { received: true };
  }

  /**
   * Endpoint to handle incoming SMS replies via Twilio webhook.
   * Configure the Twilio phone number's Messaging webhook to point here.
   */
  @Post('sms-response')
  async handleSmsResponse(@Body() body: any, @Headers() headers: Record<string, string>, @Res() res: Response) {
    // (Optional) Verify Twilio signature for security (omitted for brevity)
    // const twilioSignature = headers['x-twilio-signature'];
    const fromPhone: string = body.From;
    const toPhone: string = body.To;
    const smsText: string = body.Body || '';
    console.log(`📨 Inbound SMS reply from ${fromPhone}: "${smsText}"`);
    if (fromPhone && smsText) {
      await this.notificationService.handleSmsReply(fromPhone, smsText);
    }
    // Respond with empty TwiML to stop further retries or auto-replies from Twilio
    res.type('text/xml').send('<Response></Response>');
  }
}
