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
  HttpException,
  HttpStatus,
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
  @Param('provider') provider: 'acuity' | 'square' | 'google',
  @Req() req: RequestWithUser,
  @Res() res: Response,
) {
  try {
    const url = this.authService.getAuthorizationUrl(provider, req.user.id);
    return res.json({ redirectUrl: url });
  } catch {
    throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
  }
}

@Get('callback/:provider')
async oauthCallback(
  @Param('provider') provider: 'acuity' | 'square' | 'google',
  @Query('code') code: string,
  @Query('state') state: string,
  @Res() res: Response,
) {
  try {
    await this.authService.exchangeTokenAndSave(provider, code, state);

    // Solo para Acuity y Google
    if (provider !== 'square') {
      await this.authService.ensureWebhook(provider, state);
    }

    return res.redirect(
      `${process.env.FRONTEND_ORIGIN}/dashboard/integrations?provider=${provider}&status=success`
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.status(500).send(`Error connecting ${provider}: ${err.message}`);
  }
}
}

