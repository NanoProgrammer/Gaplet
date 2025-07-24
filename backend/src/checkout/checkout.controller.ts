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
  success_url: `${this.configService.get('FRONTEND_ORIGIN')}/payment-success`,
  cancel_url: `${this.configService.get('FRONTEND_ORIGIN')}/payment-cancel`,
});



  return { url: session.url };
}

@Post('cancel-subscription')
async cancelSubscription(@Req() req: Request) {
  const email = (req.user as any).email;

  // 1. Buscar el cliente de Stripe por email
  const customers = await this.stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) throw new BadRequestException('Cliente de Stripe no encontrado.');

  // 2. Obtener la suscripción activa del cliente
  const subs = await this.stripe.subscriptions.list({
    customer: customer.id,
    status: 'active',
    limit: 1
  });
  const subscription = subs.data[0];
  if (!subscription) throw new BadRequestException('No se encontró suscripción activa.');

  // 3. Si la suscripción está en período de prueba, cancelar al final del período de prueba
  if (subscription.status === 'trialing') {
    // Cancela al final de la prueba para que no se cobre nada
    await this.stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
    return { message: 'Suscripción en prueba programada para cancelarse al finalizar el trial.' };
  }

  // 4. Obtener la última factura y expandir sus pagos para ubicar el PaymentIntent
  const latestInvoiceId = typeof subscription.latest_invoice === 'string'
    ? subscription.latest_invoice 
    : subscription.latest_invoice?.id;
  let paymentIntentId: string | undefined = undefined;
  let amountPaid = 0;
  if (latestInvoiceId) {
    const invoice = await this.stripe.invoices.retrieve(latestInvoiceId, { expand: ['payments'] });
    amountPaid = invoice.amount_paid ?? 0;
    if (invoice.payments?.data?.length) {
      // Tomar el primer pago asociado (el PaymentIntent de la última factura)
      const paymentEntry = invoice.payments.data[0];
      if (paymentEntry.payment?.type === 'payment_intent') {
        // `paymentEntry.payment.payment_intent` puede ser ID (string) o objeto expandido
        const pi = paymentEntry.payment.payment_intent;
        paymentIntentId = typeof pi === 'string' ? pi : pi.id;
      }
    }
  }

  const tuvoTrial = !!subscription.trial_start; 
  const fueCobrado = amountPaid > 0 && paymentIntentId;
  if (tuvoTrial && fueCobrado && paymentIntentId) {
    // Si la suscripción originalmente tuvo un trial y ya hubo un cobro, asumimos que es el primer cobro post-trial.
    // Cancelar inmediatamente y reembolsar ese pago.
    await this.stripe.subscriptions.cancel(subscription.id);
    await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    return { message: 'Suscripción cancelada inmediatamente y pago reembolsado.' };
  }

  // 5. Para suscripciones sin trial (o cobros fuera del primer ciclo), cancelar al final del periodo vigente
  await this.stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
  return { message: 'Suscripción cancelada al final del período actual.' };
}


}
