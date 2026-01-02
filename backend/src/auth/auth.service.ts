import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailerService } from '../common/mailer/mailer.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private mailerService: MailerService,
    ) { }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.phone, loginDto.password);

        if (!user) {
            throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không đúng');
        }

        const payload = {
            sub: user.id,
            phone: user.phone,
            email: user.email,
            role: user.role
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                role: user.role,
            },
        };
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
                phone: registerDto.phone,
                dateOfBirth: registerDto.dateOfBirth ? new Date(registerDto.dateOfBirth) : null,
            }
        });

        return this.login({ phone: registerDto.phone, password: registerDto.password });
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
}
