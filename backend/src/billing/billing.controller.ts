import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('billing')
@UseGuards(AuthGuard('jwt')) // solo usuarios logueados
export class BillingController {
  private stripe: Stripe;

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY'));
  }

  @Post('customer-portal')
  async createCustomerPortal(@Req() req: Request) {
    const user = req.user as any;

    let customerId = user.stripeCustomerId; // si lo tienes guardado

    if (!customerId) {
      // Buscar por email (si no lo tienes en DB)
      const existing = await this.stripe.customers.list({ email: user.email });
      customerId = existing.data[0]?.id;

      if (!customerId) {
        const newCustomer = await this.stripe.customers.create({ email: user.email });
        customerId = newCustomer.id;
        // ⚠️ Si quieres, guarda el customerId en tu base de datos aquí
      }
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.config.get('FRONTEND_URL')}/dashboard`, // o donde tú quieras
    });

    return { url: session.url };
  }
}
