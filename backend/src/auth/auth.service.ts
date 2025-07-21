import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import * as nodemailer from 'nodemailer';
import { PrismaManagerService } from 'src/prisma-manager/prisma-manager.service';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {CreateUserPreferenceDto} from './dto/create-user-preference.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaManagerService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  async register(createAuthDto: CreateAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: createAuthDto.email,
      },
    });
    if (user) {
      throw new ConflictException('User already exists');
    }
    if (createAuthDto.password.length < 6) {
      throw new ConflictException(
        'Password must be at least 6 characters long',
      );
    }
    const hashedPassword = await argon.hash(createAuthDto.password);
    const newUser = await this.prisma.user.create({
      data: {
        ...createAuthDto,
        password: hashedPassword,
      },
    });
    newUser.password = undefined; // Remove password from the response
    return newUser;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new ConflictException('User not found');
    }

    const isPasswordValid = await argon.verify(user.password, password);
    if (!isPasswordValid) {
      throw new ConflictException('Invalid password');
    }

    return this.generateTokens(user.id, user.email);
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Optional: store hashed refreshToken in DB to validate later
    return {
      accessToken,
      refreshToken,
    };
  }

 async requestPasswordReset(email: string) {
  console.log('📩 [ResetPassword] Start for:', email);

  try {
    // 1. Buscar usuario
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn('⚠️ Email not found:', email);
      throw new NotFoundException('Email not registered');
    }

    console.log('✅ User found:', user.id, user.email);

    // 2. Generar token
    const token = await this.jwt.signAsync(
      { sub: user.id },
      { expiresIn: '15m', secret: this.config.get('JWT_ACCESS_SECRET') },
    );

    const resetLink = `https://gaplet.vercel.app/recoverPassword/${token}`;
    console.log('🔗 Reset link:', resetLink);

    // 3. Verificar credenciales de correo
    const emailUser = this.config.get('EMAIL_USER');
    const emailPass = this.config.get('EMAIL_PASS');

    if (!emailUser || !emailPass) {
      console.error('❌ EMAIL_USER or EMAIL_PASS missing in env');
      throw new Error('Missing email credentials');
    }

    // 4. Crear transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // 5. Preparar correo
    const userName = user.name?.replace(/[^a-zA-Z0-9 ]/g, '') || 'there';
    const mailOptions = {
      to: user.email,
      from: emailUser,
      subject: 'Gaplet Password Reset Request',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${userName},</h2>
          <p>You requested a password reset. Click the button below:</p>
          <p><a href="${resetLink}" style="background:#007bff;color:white;padding:10px 15px;border-radius:5px;text-decoration:none;">Reset Password</a></p>
          <p>If you didn't request this, you can ignore this email.</p>
          <small>This link expires in 15 minutes.</small>
        </div>
      `,
    };

    console.log('📨 Sending email to:', user.email);

    // 6. Enviar correo
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent:', info.messageId);
    return { message: 'Password reset link sent to your email' };

  } catch (error) {
    console.error('❌ [ResetPassword] ERROR:', {
      message: error.message,
      stack: error.stack,
      full: error,
    });

    // Si es error de autenticación con Gmail
    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
      throw new BadRequestException('Email login failed: check EMAIL_USER and EMAIL_PASS');
    }

    // Si es otro error SMTP
    if (error?.responseCode) {
      throw new BadRequestException(`Email send failed [${error.responseCode}]: ${error.message}`);
    }

    throw new BadRequestException(error.message || 'Unexpected error while sending reset email');
  }
}


async saveUserPreference(userId: string, data: CreateUserPreferenceDto) {
  return this.prisma.userPreference.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId },
  });
}


  async resetPassword(token: string, newPassword: string) {
    try {
      // Decode JWT
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      if (!payload?.sub) throw new BadRequestException('Invalid token');

      // Hash the new password
      const hashedPassword = await argon.hash(newPassword);

      // Update the user's password in the DB
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
      });

      return { message: 'Password reset successful' };
    } catch (err) {
      throw new BadRequestException('Invalid or expired token');
    }
  }

async findOrCreateGoogleUser(profile: {
  email: string;
  firstName: string;
  lastName: string;
  refreshToken?: string;
}) {
  const existingUser = await this.prisma.user.findUnique({
    where: { email: profile.email },
  });

  if (existingUser) {
    // Si ya existe, actualizamos el refreshToken solo si recibimos uno nuevo
    if (profile.refreshToken) {
      await this.prisma.user.update({
        where: { email: profile.email },
        data: {
          googleRefreshToken: profile.refreshToken,
        } as any, // 👈 Solución al error TS2353
      });
    }
    return existingUser;
  }

  const hash = await argon.hash(this.config.get('DEFAULT_PASSWORD'));

  const userData: any = {
    email: profile.email,
    name: `${profile.firstName} ${profile.lastName}`,
    password: hash,
  };

  if (profile.refreshToken) {
    userData.googleRefreshToken = profile.refreshToken;
  }

  return this.prisma.user.create({
    data: userData,
  });
}

  /* ---------------------------------------------------------
   1)  EXCHANGE TOKEN  +  SAVE IN ConnectedIntegration
--------------------------------------------------------- */
/* ---------------------------------------------
   1) TOKEN EXCHANGE + SAVE — with Google added
--------------------------------------------- */

async exchangeTokenAndSave(
  provider: 'acuity' | 'square' | 'google',
  code: string,
  userId: string,
) {
  const api = this.config.get('API_BASE_URL');
  const redirect = `${api}/auth/callback/${provider}`;
  let tokenRes: any;
  let externalUserId: string | null = null;
  let externalOrgId: string | null = null;

  switch (provider) {
    case 'acuity': {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ACUITY_CLIENT_ID!,
        client_secret: process.env.ACUITY_CLIENT_SECRET!,
        code,
        redirect_uri: redirect,
      });

      tokenRes = await fetch('https://acuityscheduling.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      }).then(r => r.json());

      if (!tokenRes.access_token) throw new Error(`Acuity token error: ${tokenRes.error}`);
      break;
    }

    case 'square': {
      tokenRes = await fetch('https://connect.squareup.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.SQUARE_CLIENT_ID,
          client_secret: process.env.SQUARE_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirect,
        }),
      }).then(r => r.json());

      if (!tokenRes.access_token) throw new Error(`Square token error: ${tokenRes.error}`);

      const merchant = await fetch('https://connect.squareup.com/v2/merchants/me', {
        headers: { Authorization: `Bearer ${tokenRes.access_token}` },
      }).then(r => r.json());

      externalUserId = merchant.merchant?.id || null;
      break;
    }

    case 'google': {
      const params = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirect,
        grant_type: 'authorization_code',
      });

      tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      }).then(r => r.json());

      if (!tokenRes.access_token) throw new Error(`Google token error: ${tokenRes.error}`);

      const profile = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenRes.access_token}` },
      }).then(r => r.json());

      externalUserId = profile.id || null;
      break;
    }
  }

  const { access_token, refresh_token, expires_in, expires_at, scope } = tokenRes;
  const expires = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : expires_at
    ? new Date(expires_at)
    : null;

  await this.prisma.connectedIntegration.upsert({
    where: { userId },
    update: {
      provider,
      accessToken: access_token,
      refreshToken: refresh_token ?? null,
      expiresAt: expires,
      scope,
      externalUserId,
      externalOrgId,
    },
    create: {
      userId,
      provider,
      accessToken: access_token,
      refreshToken: refresh_token ?? null,
      expiresAt: expires,
      scope,
      externalUserId,
      externalOrgId,
    },
  });
}


/* ---------------------------------------------
   2) ENSURE WEBHOOK — Add Google manually later
--------------------------------------------- */
async ensureWebhook(
  provider: 'acuity' | 'square' | 'google',
  userId: string,
) {
  const integration = await this.prisma.connectedIntegration.findUniqueOrThrow({
    where: { userId },
  });

  if (integration.webhookId) return;
  let base = this.config.get('API_BASE_URL');
  const target = `${base}/webhooks/${provider}`;

  switch (provider) {
    case 'acuity': {
      const res = await fetch('https://acuityscheduling.com/api/v1/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${integration.accessToken}`,
        },
        body: JSON.stringify({ url: target, event: 'appointment.canceled' }),
      }).then(r => r.json());

      console.log('🪵 Acuity full webhook response:', res);

      if (!res.id) {
        console.error('❌ Acuity webhook creation failed:', res);
        throw new Error(`Acuity webhook error: ${JSON.stringify(res)}`);
      }
      console.log('📦 API_BASE_URL resolved:', base);
console.log('📦 Target URL:', target);

      await this.prisma.connectedIntegration.update({
        where: { id: integration.id },
        data: { webhookId: res.id.toString() },
      });
      break;
    }

    case 'square': {
      const res = await fetch('https://connect.squareup.com/v2/webhooks/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          name: 'Gaplet–Canceled',
          event_types: ['bookings.canceled', 'appointments.cancelled'],
          notification_url: target,
        }),
      }).then(r => r.json());

      console.log('🪵 Square webhook response:', res);

      const webhookId = res.subscription?.id;
      if (!webhookId) {
        console.error('❌ Square webhook creation failed:', res);
        throw new Error(`Square webhook error: ${JSON.stringify(res)}`);
      }

      await this.prisma.connectedIntegration.update({
        where: { id: integration.id },
        data: { webhookId },
      });
      break;
    }

    case 'google': {
      const channelId = `gaplet-${crypto.randomUUID()}`;
      const calendarId = 'primary';

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${integration.accessToken}`,
          },
          body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address: target,
          }),
        }
      ).then(r => r.json());

      console.log('🪵 Google webhook response:', res);

      if (!res.id || !res.resourceId) {
        console.error('❌ Google webhook creation failed:', res);
        throw new Error('Google Calendar webhook setup failed');
      }

      await this.prisma.connectedIntegration.update({
        where: { id: integration.id },
        data: {
          webhookId: res.id,
          externalOrgId: res.resourceId,
        },
      });
      break;
    }
  }
}



async validateAccessToken(token: string) {
  try {
    const payload = await this.jwt.verifyAsync(token, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });

    if (!payload?.sub) {
      throw new BadRequestException('Invalid token payload');
    }

    return payload;
  } catch (err) {
    throw new BadRequestException('Invalid or expired token');
  }
}

async getUserPreference(userId: string) {
  return this.prisma.userPreference.findUnique({
    where: { userId },
  });
}


}

