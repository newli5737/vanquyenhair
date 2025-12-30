import { Module } from '@nestjs/common';
import { FaceVerificationService } from './face-service.service';
import { FaceVerificationController } from './face-service.controller';

@Module({
    controllers: [FaceVerificationController],
    providers: [FaceVerificationService],
    exports: [FaceVerificationService],
})
export class FaceServiceModule { }
