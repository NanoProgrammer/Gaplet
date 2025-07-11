import { Controller, Post, Req, Res } from '@nestjs/common';
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
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'));
  }

  @Post('stripe')
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
      console.error('❌ Webhook signature invalid', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ 1. Asignar rol cuando el checkout se completa
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const priceId = session.metadata?.priceId;

      const role = this.mapPriceToRole(priceId);

      if (userId && role) {
        await this.userService.updateUserRole(userId, role);
        console.log(`✅ Asignado rol ${role} a usuario ${userId}`);
      }
    }

    // 🛑 2. Revocar rol si cancela la suscripción
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        await this.userService.updateUserRole(userId, 'USER');
        console.log(`⚠️ Rol revocado para usuario ${userId} (cancelación)`);
      }
    }

    return res.status(200).send('Webhook handled');
  }

  // 🎯 Mapea los priceId a roles de tu sistema
  private mapPriceToRole(priceId: string): string {
    const roles = {
      [this.configService.get('STRIPE_PRICE_ID_STARTER')]: 'STARTER',
      [this.configService.get('STRIPE_PRICE_ID_PRO')]: 'PRO',
      [this.configService.get('STRIPE_PRICE_ID_PREMIUM')]: 'PREMIUM',
    };
    return roles[priceId] || 'USER';
  }
}
