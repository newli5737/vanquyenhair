import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailerService } from '../common/mailer/mailer.service';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private mailerService: MailerService,
        private configService: ConfigService,
    ) { }

    async login(loginDto: LoginDto, deviceInfo?: any) {
        console.log(`[AuthService] Login attempt for phone: ${loginDto.phone}`);
        const user = await this.validateUser(loginDto.phone, loginDto.password);

        if (!user) {
            console.warn(`[AuthService] Login failed for phone: ${loginDto.phone} - Invalid credentials`);
            throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không đúng');
        }

        console.log(`[AuthService] Login success for user: ${user.id} (Role: ${user.role})`);
        const { accessToken, refreshToken } = await this.generateTokens(user, deviceInfo);

        return {
            accessToken,
            refreshToken,
            expiresIn: 365 * 24 * 60 * 60,
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                role: user.role,
            },
        };
    }

    async generateTokens(user: any, deviceInfo?: any) {
        const payload = {
            sub: user.id,
            phone: user.phone,
            email: user.email,
            role: user.role,
            deviceHash: deviceInfo ? this.hashDevice(deviceInfo) : undefined, // Optional device fingerprint
        };

        // Access token (JWT, 1 year - for mobile convenience)
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '365d'
        });

        // Refresh token (JWT-based, 2 years - for mobile convenience)
        const refreshToken = this.jwtService.sign(
            { sub: user.id, type: 'refresh' },
            {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: '730d',
            }
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 730); // 2 years

        // Save refresh token to database
        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt
            }
        });

        return { accessToken, refreshToken };
    }

    async verifyRefreshToken(token: string) {
        // Verify JWT signature and expiration
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            // Check if token exists in DB and not revoked
            const refreshToken = await this.prisma.refreshToken.findUnique({
                where: { token },
                include: { user: true }
            });

            if (!refreshToken || refreshToken.isRevoked) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            if (new Date() > refreshToken.expiresAt) {
                throw new UnauthorizedException('Refresh token expired');
            }

            return refreshToken.user;
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async refreshAccessToken(refreshToken: string) {
        const user = await this.verifyRefreshToken(refreshToken);

        const payload = {
            sub: user.id,
            phone: user.phone,
            email: user.email,
            role: user.role
        };

        // Generate new access token (1 year)
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '365d'
        });

        // Generate new refresh token (2 years)
        const newRefreshToken = this.jwtService.sign(
            { sub: user.id, type: 'refresh' },
            {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: '730d',
            }
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 730); // 2 years

        // Revoke old refresh token and create new one
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken },
            data: { isRevoked: true }
        });

        await this.prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: user.id,
                expiresAt
            }
        });

        return { accessToken, refreshToken: newRefreshToken };
    }

    async logout(refreshToken: string) {
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken },
            data: { isRevoked: true }
        });
    }

    async logoutAll(userId: string) {
        await this.prisma.refreshToken.updateMany({
            where: { userId },
            data: { isRevoked: true }
        });
    }

    async register(registerDto: any) {
        // Check if user exists by phone
        const existingUser = await this.prisma.user.findUnique({
            where: { phone: registerDto.phone },
        });

        if (existingUser) {
            throw new UnauthorizedException('Số điện thoại đã tồn tại');
        }

        // Check if email exists (if provided)
        if (registerDto.email) {
            const existingEmail = await this.prisma.user.findUnique({
                where: { email: registerDto.email },
            });

            if (existingEmail) {
                throw new UnauthorizedException('Email đã tồn tại');
            }
        }

        const hashedPassword = await this.hashPassword(registerDto.password);

        console.log(`[AuthService] Creating user with phone: ${registerDto.phone}, role: STUDENT`);
        // Create User
        const user = await this.prisma.user.create({
            data: {
                phone: registerDto.phone,
                email: registerDto.email || null,
                passwordHash: hashedPassword,
                role: 'STUDENT', // Default role
            },
        });

        // Create empty StudentProfile linked to user
        const profiles = await this.prisma.studentProfile.findMany({
            where: { studentCode: { startsWith: 'S' } },
            select: { studentCode: true }
        });

        let maxNumber = 0;
        profiles.forEach(p => {
            const numPart = p.studentCode.substring(1);
            if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart);
                if (num > maxNumber) maxNumber = num;
            }
        });

        const nextNumber = maxNumber + 1;

        const studentCode = `S${nextNumber.toString().padStart(4, '0')}`;

        await this.prisma.studentProfile.create({
            data: {
                userId: user.id,
                fullName: registerDto.fullName,
                studentCode: studentCode,
                // phone removed
                dateOfBirth: registerDto.dateOfBirth ? new Date(registerDto.dateOfBirth) : null,
            } as any // Cast as any because generated client is outdated
        });

        const { accessToken, refreshToken } = await this.generateTokens(user);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                role: user.role,
            },
        };
    }

    async validateUser(phone: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { phone },
        });

        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return null;
        }

        return user;
    }

    async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    private hashDevice(deviceInfo: any): string {
        return crypto
            .createHash('md5')
            .update(JSON.stringify(deviceInfo))
            .digest('hex');
    }

    async changePassword(userId: string, data: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('Người dùng không tồn tại');
        }

        const isPasswordValid = await bcrypt.compare(data.oldPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Mật khẩu cũ không chính xác');
        }

        const hashedPassword = await this.hashPassword(data.newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword },
        });

        return { message: 'Đổi mật khẩu thành công' };
    }

    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { studentProfile: true }
        });

        if (!user) {
            throw new UnauthorizedException('Email không tồn tại trong hệ thống');
        }

        // Generate a random 6-digit password
        const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = await this.hashPassword(newPassword);

        // Update password in DB
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword },
        });

        // Send email
        const fullName = user.studentProfile ? user.studentProfile.fullName : 'Học viên';
        await this.mailerService.sendNewPassword(email, fullName, newPassword);

        return { message: 'Mật khẩu mới đã được gửi vào email của bạn' };
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phone: true,
                email: true,
                role: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Người dùng không tồn tại');
        }

        return user;
    }
}
