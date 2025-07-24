import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';

@Controller('checkout')
@UseGuards(AuthGuard('jwt'))
export class CheckoutController {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaManagerService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'));
  }

  @Post('create-session')
async createCheckoutSession(@Req() req: Request, @Body('plan') plan: string) {
  const user = req.user as any;
  const userId = user.id;
  const email = user.email;
  const currentRole = user.role;

  const priceMap = {
    starter: this.configService.get('STRIPE_PRICE_ID_STARTER'),
    pro: this.configService.get('STRIPE_PRICE_ID_PRO'),
    premium: this.configService.get('STRIPE_PRICE_ID_PREMIUM'),
  };

  const priceId = priceMap[plan.toLowerCase()];
  if (!priceId) {
    throw new BadRequestException(`Invalid plan: ${plan}`);
  }

  // 1. Buscar (o crear) el cliente en Stripe
  const customers = await this.stripe.customers.list({ email, limit: 10 });
  let stripeCustomer = customers.data.find((c) => c.email === email);

  if (!stripeCustomer) {
    stripeCustomer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  // 2. Cancelar cualquier suscripción activa del cliente
  const subscriptions = await this.stripe.subscriptions.list({
    customer: stripeCustomer.id,
    status: 'active',
    limit: 5,
  });

  for (const sub of subscriptions.data) {
  // Si la suscripción está en trial, cancélala al final del trial
  if (sub.status === 'trialing') {
    await this.stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
  } else {
    // Si ya está activa, cancela inmediatamente
    await this.stripe.subscriptions.cancel(sub.id);
  }
}


  // 3. Verificar si el usuario es elegible para trial
  const hasPremiumFeatures = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      connectedIntegration: { select: { id: true } },
      preferences: { select: { id: true } },
    },
  });

  const trialEligible =
    currentRole === 'USER' &&
    !hasPremiumFeatures?.connectedIntegration &&
    !hasPremiumFeatures?.preferences;

  // 4. Crear la sesión de pago
  const session = await this.stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: stripeCustomer.id,
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: {
    trial_period_days: trialEligible ? 7 : undefined,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel', // evita cobrar si no agregó método
      },
    },
  },
  payment_method_collection: 'if_required', // ✅ muy importante
  metadata: { userId, priceId },
  success_url: `${origin}/payment-success`,
  cancel_url: `${origin}/payment-cancel`,
});



  return { url: session.url };
}

@Post('cancel-subscription')
async cancelSubscription(@Req() req: Request) {
  const email = (req.user as any).email;

  // 1. Buscar cliente
  const customer = (await this.stripe.customers.list({ email, limit: 1 })).data[0];
  if (!customer) throw new BadRequestException('Cliente de Stripe no encontrado.');

  // 2. Obtener suscripción activa con factura + intent expandido
  const subscription = (await this.stripe.subscriptions.list({
    customer: customer.id,
    status: 'active',
    limit: 1,
    expand: ['data.latest_invoice.payment_intent'], // NECESARIO
  })).data[0];

  if (!subscription) throw new BadRequestException('No se encontró suscripción activa.');

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent | null;

  const isTrial = !!subscription.trial_start;
  const wasCharged = invoice.amount_paid > 0;

  if (isTrial && wasCharged && paymentIntent?.id) {
    // 🚨 Cancelar de inmediato
    await this.stripe.subscriptions.cancel(subscription.id);

    // 💸 Refund inmediato
    await this.stripe.refunds.create({
      payment_intent: paymentIntent.id,
    });

    return { message: 'Suscripción cancelada y reembolso emitido.' };
  }

  // ⏳ Cancelar al final del ciclo si no aplica refund
  await this.stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true,
  });

  return { message: 'Suscripción programada para cancelación al final del período.' };
}

}
