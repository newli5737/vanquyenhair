import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto, @Request() req: any) {
        // Extract device info for fingerprinting
        const deviceInfo = {
            userAgent: req.headers['user-agent'],
            ip: req.ip,
        };

        const result = await this.authService.login(loginDto, deviceInfo);

        return {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            message: 'Đăng nhập thành công'
        };
    }

    @Post('register')
    async register(@Body() registerDto: any) {
        const result = await this.authService.register(registerDto);

        return {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            message: 'Đăng ký thành công'
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body('refreshToken') refreshToken: string) {
        console.log(`[AuthController] Refresh attempt via body. Has token: ${!!refreshToken}`);
        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token provided in request body');
        }

        const { accessToken, refreshToken: newRefreshToken } = await this.authService.refreshAccessToken(refreshToken);

        return {
            accessToken,
            refreshToken: newRefreshToken,
            message: 'Token refreshed'
        };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Body('refreshToken') refreshToken: string) {
        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        return { message: 'Đăng xuất thành công' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getMe(@Request() req: any) {
        return this.authService.getMe(req.user.userId);
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async changePassword(@Request() req, @Body() body: any) {
        return this.authService.changePassword(req.user.userId, body);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body('email') email: string) {
        return this.authService.forgotPassword(email);
    }
}
