import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaManagerService } from 'src/prisma-manager/prisma-manager.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private prisma: PrismaManagerService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // or from cookie
      secretOrKey: process.env.JWT_REFRESH_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });
    delete user.password; // Remove password from the user object
    return user;
  }
}