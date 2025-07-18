import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  Res,
  Param,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {CreateUserPreferenceDto} from './dto/create-user-preference.dto'
import { CreateAuthDto } from './dto/create-auth.dto';
import { ResetPasswordDto } from './dto/newpassword.dto';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';


interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.register(createAuthDto);
  }

    @UseGuards(AuthGuard('jwt'))
@Get('preference')
async getPreference(@Req() req: RequestWithUser) {
  return this.authService.getUserPreference(req.user.id);
}

@UseGuards(AuthGuard('jwt'))
@Post('preference')
async savePreference(
  @Req() req: RequestWithUser,
  @Body() body: CreateUserPreferenceDto,
) {
  return this.authService.saveUserPreference(req.user.id, body);
}


  @HttpCode(200)
  @Post('login')
  login(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.login(createAuthDto.email, createAuthDto.password);
  }

  @Post('request-password-reset')
  requestReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@Req() req: RequestWithUser) {
    const { accessToken } = await this.authService.generateTokens(
      req.user.id,
      req.user.email,
    );
    return { accessToken };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res: Response) {
    try {
      const userData = req.user;

      if (!userData || !userData.email) {
        return res.status(400).send('Google login failed');
      }

      const user = await this.authService.findOrCreateGoogleUser(userData);

      const tokens = await this.authService.generateTokens(user.id, user.email);

      const FRONTEND_ORIGIN =
        process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

      const html = `
      <script>
        window.opener.postMessage(
          {
            accessToken: '${tokens.accessToken}',
            refreshToken: '${tokens.refreshToken}',
            user: ${JSON.stringify(user)}
          },
          '${FRONTEND_ORIGIN}'
        );
        window.close();
      </script>
    `;

      return res.send(html);
    } catch (error) {
      console.error('Google callback error:', error);
      return res
        .status(500)
        .send('Internal Server Error during Google OAuth callback.');
    }
  }


@UseGuards(AuthGuard('jwt'))
@Get('connect/:provider')
async connectProvider(
  @Param('provider') provider: 'calendly' | 'acuity' | 'square',
  @Req() req: RequestWithUser,
  @Res() res: Response,
) {
  const userId = req.user.id;

  const apiBase = process.env.API_BASE_URL;
  const redirect = encodeURIComponent(`${apiBase}/auth/callback/${provider}`);
  const state = userId;

  let url = '';

  switch (provider) {
    case 'calendly': {
      // ✅ Scopes válidos de Calendly según su documentación oficial
      const scope = [
        'organization.read',
        'user.read',
        'event_type.read',
        'scheduled_event.read',
        'webhook_subscription.read',
        'webhook_subscription.write',
        'invitee.read'
      ].join(' ');

      url = `https://auth.calendly.com/oauth/authorize` +
        `?client_id=${process.env.CALENDLY_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${redirect}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${state}`;
      break;
    }

    case 'acuity': {
      const scope = 'api-v1';
      url = `https://acuityscheduling.com/oauth2/authorize` +
        `?client_id=${process.env.ACUITY_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${redirect}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${state}`;
      break;
    }

    case 'square': {
      // ✅ Scopes válidos para bookings y customers (2024)
      const scope = [
        'BOOKINGS_READ',
        'BOOKINGS_WRITE',
        'CUSTOMERS_READ',
        'CUSTOMERS_WRITE',
        'MERCHANT_PROFILE_READ',
        'MERCHANT_PROFILE_READ',
        'APPOINTMENTS_READ',
        'APPOINTMENTS_WRITE'
      ].join(' ');

      url = `https://connect.squareup.com/oauth2/authorize` +
        `?client_id=${process.env.SQUARE_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${redirect}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${state}` +
        `&session=false`;
      break;
    }

    default:
      return res.status(400).send('Unsupported provider');
  }

  return res.json({ redirectUrl: url });
}



  @Get('callback/:provider')
  async oauthCallback(
    @Param('provider') provider: 'calendly' | 'acuity' | 'square',
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.authService.exchangeTokenAndSave(provider, code, state);
      await this.authService.ensureWebhook(provider, state);
      return res.redirect(
        `${process.env.FRONTEND_ORIGIN}/dashboard/integrations?provider=${provider}&status=success`,
      );
    } catch (err) {
      console.error('OAuth callback error:', err);
      return res
        .status(500)
        .send(`Error while connecting ${provider}: ` + err.message);
    }
  }


}
