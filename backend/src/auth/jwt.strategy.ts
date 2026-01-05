import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return (req as any)?.cookies?.accessToken;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken() // Fallback for testing
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET') || 'default-secret-key',
        });
    }

    async validate(payload: any) {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role
        };
    }
}
