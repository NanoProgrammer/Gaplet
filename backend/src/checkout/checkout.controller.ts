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
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      ...(trialEligible ? { trial_period_days: 7 } : {}),
      metadata: {
        userId,
      },
    },
    metadata: {
      userId,
      priceId,
    },
    success_url: `${this.configService.get('FRONTEND_ORIGIN')}/payment-success`,
    cancel_url: `${this.configService.get('FRONTEND_ORIGIN')}/payment-cancel`,
  });

  return { url: session.url };
}


@Post('cancel-subscription')
async cancelSubscription(@Req() req: Request) {
  const user = req.user as any;
  const userId = user.id;
  const email = user.email;

  // 1. Buscar cliente en Stripe
  const customers = await this.stripe.customers.list({ email, limit: 10 });
  const stripeCustomer = customers.data.find(c => c.email === email);

  if (!stripeCustomer) {
    throw new BadRequestException('Stripe customer not found for this user.');
  }

  // 2. Buscar suscripciones activas
  const subscriptions = await this.stripe.subscriptions.list({
    customer: stripeCustomer.id,
    status: 'active',
    limit: 5,
  });

  if (subscriptions.data.length === 0) {
    throw new BadRequestException('No active subscription found for this user.');
  }

  const now = Date.now();

  // 3. Procesar cada suscripción activa
  for (const sub of subscriptions.data) {
    const isTrial = sub.status === 'trialing' || !!sub.trial_end;
    const trialStillActive = sub.trial_end && sub.trial_end * 1000 > now;

    // Cancelar al final del período (trial o pago)
    await this.stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });

    console.log(`⏳ Subcripción ${sub.id} marcada para cancelación al final del período`);

    // 4. Si estaba en trial pero ya fue cobrado → emitir refund
    if (isTrial && !trialStillActive) {
      // Buscar invoice más reciente
      const invoices = await this.stripe.invoices.list({
        subscription: sub.id,
        limit: 1,
      });

      const invoice = invoices.data[0];
      if (!invoice) {
        console.log(`ℹ️ No invoice found for subscription ${sub.id}`);
        continue;
      }

      // Usar el nuevo endpoint invoicePayments para obtener el payment_intent
      const invoicePayments = await this.stripe.invoicePayments.list({
        invoice: invoice.id,
        limit: 1,
      });

      const paymentIntent = invoicePayments.data[0]?.payment?.payment_intent;

const paymentIntentId =
  typeof paymentIntent === 'string'
    ? paymentIntent
    : paymentIntent?.id;

if (paymentIntentId) {
  await this.stripe.refunds.create({ payment_intent: paymentIntentId });
  console.log(`💸 Refund creado para payment_intent ${paymentIntentId}`);
} else {
  console.log(`ℹ️ No se encontró payment_intent válido para refund`);
}

    }
  }

  return {
    message: 'Suscripciones canceladas al final del período. Refund automático emitido si aplicaba.',
  };
}

}
