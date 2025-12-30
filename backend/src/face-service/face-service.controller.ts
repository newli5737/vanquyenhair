import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { FaceVerificationService } from './face-service.service';
import { VerifyFaceDto } from './dto/verify-face.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('face-verification')
@UseGuards(JwtAuthGuard)
export class FaceVerificationController {
    constructor(private readonly faceVerificationService: FaceVerificationService) { }

    @Post('verify')
    async verify(@Req() req, @Body() dto: VerifyFaceDto) {
        return this.faceVerificationService.verifyIdentity(req.user.id, dto);
    }
}
