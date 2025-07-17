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
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service'; // Asegúrate que esto esté correcto

@Controller('checkout')
@UseGuards(AuthGuard('jwt'))
export class CheckoutController {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaManagerService,
  ) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'));
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

    const priceId = priceMap[plan];
    if (!priceId) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    // 🔍 Verifica si ya usó funciones premium
    const hasPremiumFeatures = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        connectedIntegration: { select: { id: true } },
        preferences: { select: { id: true } },
      },
    });

    const trialEligible =
      currentRole === 'USER' &&
      !hasPremiumFeatures.connectedIntegration &&
      !hasPremiumFeatures.preferences;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
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
          priceId,
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

  // Busca el customer de Stripe desde la última sesión
  const latestSubscription = await this.stripe.subscriptions.list({
    limit: 1,
    status: 'active',
    expand: ['data.customer'],
  });

  const subscription = latestSubscription.data.find((s) => {
    return s.metadata?.userId === userId;
  });

  if (!subscription) {
    throw new BadRequestException('No active subscription found for this user.');
  }

  // Cancela la suscripción al final del periodo actual
  await this.stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true,
  });

  return { message: 'Subscription will be cancelled at the end of the current period.' };
}

}
