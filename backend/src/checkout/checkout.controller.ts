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

  // 1. Buscar o crear cliente
  const customers = await this.stripe.customers.list({ email, limit: 1 });
  let customer = customers.data[0];
  if (!customer) {
    customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  // 2. Buscar suscripciones activas
  const subs = await this.stripe.subscriptions.list({
    customer: customer.id,
    status: 'all',
    limit: 5,
  });

  const activeSub = subs.data.find((s) =>
    ['active', 'trialing'].includes(s.status)
  );

  if (activeSub) {
    const invoiceId = typeof activeSub.latest_invoice === 'string'
      ? activeSub.latest_invoice
      : (activeSub.latest_invoice as any)?.id;

    let piId: string | undefined;
    let amountPaid = 0;

    if (invoiceId) {
      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['payment_intent'],
      });

      amountPaid = invoice.amount_paid ?? 0;
      const pi = (invoice as any).payment_intent as Stripe.PaymentIntent | undefined;
      piId = pi?.id;
    }

    const hadTrial = !!activeSub.trial_start;
    const charged = amountPaid > 0 && piId;

    // Si estaba en trial y ya pagó → reembolsar
    if (hadTrial && charged && piId) {
      await this.stripe.subscriptions.cancel(activeSub.id);
      await this.stripe.refunds.create({ payment_intent: piId });
    } else {
      // Si no ha pagado o no tuvo trial → cancelar al final
      await this.stripe.subscriptions.update(activeSub.id, {
        cancel_at_period_end: true,
      });
    }
  }

  // 3. Validar elegibilidad para trial
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

  // 4. Crear nueva sesión
  const session = await this.stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      ...(trialEligible ? { trial_period_days: 7 } : {}),
      metadata: { userId },
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

  // 1. Buscar cliente en Stripe
  const customers = await this.stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) throw new BadRequestException('Cliente no encontrado.');

  // 2. Obtener suscripción activa o en prueba
  const subs = await this.stripe.subscriptions.list({
    customer: customer.id,
    status: 'all',
    limit: 5,
  });
  const sub = subs.data.find(s => ['active', 'trialing'].includes(s.status));
  if (!sub) throw new BadRequestException('No se encontró suscripción activa o en trial.');

  // 3. Si está en período de prueba, cancela al final del trial
  if (sub.status === 'trialing') {
    await this.stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
    return { message: 'Suscripción en trial cancelada al final del período.' };
  }

  // 4. Obtener última factura y el PaymentIntent expandido
  const invoiceId = typeof sub.latest_invoice === 'string'
    ? sub.latest_invoice
    : (sub.latest_invoice as any)?.id;
  let piId: string | undefined;
  let amountPaid = 0;

  if (invoiceId) {
    const invoice = await this.stripe.invoices.retrieve(invoiceId, {
      expand: ['payment_intent'], // Expande correctamente el PaymentIntent
    });

    amountPaid = invoice.amount_paid ?? 0;
    const pi = (invoice as any).payment_intent as Stripe.PaymentIntent | undefined;
    piId = pi?.id;
  }

  const hadTrial = !!sub.trial_start;
  const charged = amountPaid > 0 && piId;

  // 5. Si hubo trial y cobro, cancelas y haces refund
  if (hadTrial && charged && piId) {
    await this.stripe.subscriptions.cancel(sub.id);
    await this.stripe.refunds.create({ payment_intent: piId });
    return { message: 'Suscripción cancelada inmediatamente y pago reembolsado.' };
  }

  // 6. En caso contrario, cancelas al final del ciclo
  await this.stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
  return { message: 'Suscripción cancelada al final del período actual.' };
}

}
