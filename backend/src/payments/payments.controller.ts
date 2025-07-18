import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

@Controller('webhooks')
export class PaymentsController {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'));
  }

  @Post('stripe')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        sig,
        this.configService.get('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err) {
      console.error('❌ Webhook signature invalid:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📩 Received Stripe event: ${event.type}`);

    // ✅ 1. Rol al completar pago
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const userId = metadata.userId;
      const priceId = metadata.priceId;

      if (!userId || !priceId) {
        console.warn('⚠️ Missing metadata in checkout.session.completed');
        return res.status(200).send('Missing metadata');
      }

      const role = this.mapPriceToRole(priceId);
      await this.userService.updateUserRole(userId, role);

      console.log(`✅ Rol "${role}" asignado a usuario ${userId}`);
    }

    // 🛑 2. Revocar rol al cancelar suscripción
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (!userId) {
        console.warn('⚠️ No userId in subscription metadata');
        return res.status(200).send('Missing userId');
      }

      await this.userService.updateUserRole(userId, 'USER');
      console.log(`⚠️ Rol revocado (USER) para usuario ${userId}`);
    }

    return res.send('Webhook handled');
  }

  private mapPriceToRole(priceId: string): string {
    const roles = {
      [this.configService.get('STRIPE_PRICE_ID_STARTER')]: 'STARTER',
      [this.configService.get('STRIPE_PRICE_ID_PRO')]: 'PRO',
      [this.configService.get('STRIPE_PRICE_ID_PREMIUM')]: 'PREMIUM',
    };
    return roles[priceId] || 'USER';
  }
}
