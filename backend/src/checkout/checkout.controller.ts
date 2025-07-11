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

@Controller('checkout')
@UseGuards(AuthGuard('jwt'))
export class CheckoutController {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'));
  }

  @Post('create-session')
  async createCheckoutSession(@Req() req: Request, @Body('plan') plan: string) {
    const user = req.user as any;
    const userId = user.id;
    const email = user.email;

    const priceMap = {
      starter: this.configService.get('STRIPE_PRICE_ID_STARTER'),
      pro: this.configService.get('STRIPE_PRICE_ID_PRO'),
      premium: this.configService.get('STRIPE_PRICE_ID_PREMIUM'),
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

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
        trial_period_days: 7, // ✅ Esto aplica el delay de 7 días
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
}
