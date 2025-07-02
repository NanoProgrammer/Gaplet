import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, HttpCode, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import {ResetPasswordDto} from './dto/newpassword.dto'
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
  const { accessToken } = await this.authService.generateTokens(req.user.id, req.user.email);
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

    const html = `
      <script>
        window.opener.postMessage(
          {
            accessToken: '${tokens.accessToken}',
            refreshToken: '${tokens.refreshToken}',
            user: ${JSON.stringify(user)}
          },
          '*'
        );
        window.close();
      </script>
    `;

    return res.send(html);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).send('Internal Server Error during Google OAuth callback.');
  }
}

}
