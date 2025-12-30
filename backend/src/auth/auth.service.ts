import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        if (!user) {
            throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                // Include profile info if available? 
                // Currently just user info.
            },
        };
    }

    async register(registerDto: any) {
        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new UnauthorizedException('Email đã tồn tại');
        }

        const hashedPassword = await this.hashPassword(registerDto.password);

        // Create User
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash: hashedPassword,
                role: 'STUDENT', // Default role
            },
        });

        // Create empty StudentProfile linked to user
        await this.prisma.studentProfile.create({
            data: {
                userId: user.id,
                fullName: registerDto.fullName,
                studentCode: 'S' + Date.now(), // Temporary code generation
                phone: '', // Default empty, update later
                dateOfBirth: registerDto.dateOfBirth ? new Date(registerDto.dateOfBirth) : null,
            }
        });

        return this.login({ email: registerDto.email, password: registerDto.password });
    }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
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
}
