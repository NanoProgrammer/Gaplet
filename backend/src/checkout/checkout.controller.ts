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
  const email = (req.user as any).email;

  const customers = await this.stripe.customers.list({ email, limit: 1 });
  const cust = customers.data[0];
  if (!cust) throw new BadRequestException('Stripe customer not found.');

  const subsList = await this.stripe.subscriptions.list({
    customer: cust.id,
    status: 'active',
    limit: 1,
    expand: ['data.latest_invoice'],
  });
  const sub = subsList.data[0];
  if (!sub) throw new BadRequestException('No active subscription found.');

  const invoice = sub.latest_invoice as Stripe.Invoice;
  const line = invoice?.lines.data[0];
  const trialEndedAt = sub.trial_end;
  const feeStart = line?.period.start;
  const amountPaid = invoice?.amount_paid || 0;

  const trialWasCharged = trialEndedAt && amountPaid > 0 && feeStart === trialEndedAt;

  if (trialWasCharged) {
    // 🔪 Cancelación inmediata con refund automático
    await this.stripe.subscriptions.cancel(sub.id);
    
    const payments = await this.stripe.invoicePayments.list({
      invoice: invoice.id,
      limit: 1,
    });
    const pi = payments.data[0]?.payment?.payment_intent;
    const piId = typeof pi === 'string' ? pi : pi?.id;
    if (piId) {
      await this.stripe.refunds.create({ payment_intent: piId });
      console.log(`💸 Refund emitido para ${piId}`);
    } else {
      console.warn(`⚠️ No se encontró payment_intent para refund.`);
    }
  } else {
    // ⏳ Cancelación al fin del período pagado o trial activo
    await this.stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    console.log(`⏳ Sub ${sub.id} cancelada al final del período.`);
  }

  return { message: 'Cancelación procesada según estado de trial o pago.' };
}


}
