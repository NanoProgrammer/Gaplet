import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { Request } from 'express';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserController {
    constructor(private userService: UserService) {}
    @Get('me')
    getMe(@Req() req:Request) {
        return req.user;
        
    }
}
