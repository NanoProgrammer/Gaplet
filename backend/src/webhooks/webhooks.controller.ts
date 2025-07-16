import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
  Req,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  @Post(':provider')
  @HttpCode(200)
  async handleWebhook(
    @Param('provider') provider: 'calendly' | 'acuity' | 'square',
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    console.log(`📩 Webhook from ${provider}`);
    console.log('Headers:', headers);
    console.log('Body:', body);

    const rawBody = JSON.stringify(body);

    /* -------------------- CALENDLY -------------------- */
    if (provider === 'calendly') {
      const signature = headers['calendly-signature'];
      const secret = process.env.WEBHOOK_CALENDLY_SECRET;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid Calendly signature');
      }

      if (body.event === 'invitee.canceled') {
        const event = body.payload;
        console.log('Calendly cancellation:', {
          eventType: event.event_type.name,
          invitee: event.invitee.name,
          scheduledEvent: event.scheduled_event.uri,
          canceledAt: event.canceled_at,
        });
      }
    }

    /* -------------------- ACUITY (sin firma) -------------------- */
    else if (provider === 'acuity') {
      if (body.status === 'canceled') {
        console.log('Acuity cancellation:', {
          id: body.id,
          name: `${body.firstName} ${body.lastName}`,
          email: body.email,
          appointmentType: body.type,
          time: body.datetime,
        });
      }
    }

    /* -------------------- SQUARE -------------------- */
    else if (provider === 'square') {
      const signature = headers['x-square-signature'];
      const secret = process.env.WEBHOOK_SQUARE_KEY;
      const url = `${process.env.API_BASE_URL}/webhooks/square`;
      const payload = url + rawBody;

      const expectedSignature = crypto
        .createHmac('sha1', secret)
        .update(payload)
        .digest('base64');

      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid Square signature');
      }

      const event = body.data?.object;
      if (
        body.event_type === 'bookings.canceled' ||
        body.event_type === 'appointments.cancelled'
      ) {
        console.log('Square cancellation:', {
          bookingId: event?.booking_id || event?.id,
          canceledAt: body.created_at,
          merchant: body.merchant_id,
        });
      }
    }

    else {
      console.warn(`⚠️ Webhook from unknown provider: ${provider}`);
    }

    return { received: true };
  }
}
