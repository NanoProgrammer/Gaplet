import { ConflictException, Injectable, NotFoundException,BadRequestException  } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import * as nodemailer from 'nodemailer';
import { PrismaManagerService } from 'src/prisma-manager/prisma-manager.service';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class AuthService {
 constructor(private prisma : PrismaManagerService, private jwt: JwtService, private config: ConfigService) {} 
  async register(createAuthDto: CreateAuthDto) {
    const user  =await this.prisma.user.findUnique({
      where: {
        email: createAuthDto.email,
      },
    });
    if (user) {
      throw new ConflictException('User already exists');
    }
    if(createAuthDto.password.length < 6) {
      throw new ConflictException('Password must be at least 6 characters long');
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
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) throw new NotFoundException('Email not registered');

  const token = await this.jwt.signAsync(
    { sub: user.id },
    { expiresIn: '15m', secret: this.config.get('JWT_SECRET') }
  );

  const resetLink = `https://simuxel.vercel.app/recover-password/${token}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: this.config.get('EMAIL_USER'),
      pass: this.config.get('EMAIL_PASS'),
    }
  });

 await transporter.sendMail({
  to: email,
  from: this.config.get('EMAIL_USER'),
  subject: 'Simuxel Password Reset Request',
  html: `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 40px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="color: #333; text-align: center;">🔐 Reset Your Simuxel Password</h2>
      <p style="color: #555;">Hi ${user.name || 'there'},</p>
      <p style="color: #555;">We received a request to reset your Simuxel password. Click the button below to continue:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="color: #777;">This link will expire in <strong>15 minutes</strong>.</p>
      <p style="color: #999; font-size: 12px;">If you didn’t request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #bbb; font-size: 12px; text-align: center;">
        &copy; ${new Date().getFullYear()} Simuxel. All rights reserved.
      </p>
    </div>
  </div>
  `,
});

  return { message: 'Password reset link sent to your email' };
}

async resetPassword(token: string, newPassword: string) {
  try {
    // Decode JWT
    const payload = await this.jwt.verifyAsync(token, {
      secret: this.config.get('JWT_SECRET'),
    });

    if (!payload?.sub) throw new BadRequestException('Invalid token');

    // Hash the new password
    const hashedPassword = await argon.hash(newPassword);

    // Update the user's password in the DB
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { password: hashedPassword }
    });

    return { message: 'Password reset successful' };
  } catch (err) {
    throw new BadRequestException('Invalid or expired token');
  }
}

async findOrCreateGoogleUser(profile: { email: string; firstName: string; lastName: string }) {
  const user = await this.prisma.user.findUnique({ where: { email: profile.email } });

  if (user) {
    // Ya existe, lo usamos tal como está
    return user;
  }

  // Si no existe, lo creamos con password nula (ya hiciste password opcional)
  return this.prisma.user.create({
    data: {
      email: profile.email,
      name: `${profile.firstName} ${profile.lastName}`,
      password: "DEFAULT_PASSWORD", // mejor que usar 'GOOGLE_AUTH_USER'
    },
  });
}


}

