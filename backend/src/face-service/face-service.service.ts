import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { VerifyFaceDto } from './dto/verify-face.dto';
import axios from 'axios';

@Injectable()
export class FaceVerificationService {
    private readonly faceApiUrl = process.env.FACE_API_URL || 'http://localhost:8001';

    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    /**
     * Verify identity for "Register Face" flow (User uploads selfie URL)
     */
    async verifyIdentity(userId: string, dto: VerifyFaceDto) {
        console.log('=== FACE IDENTITY VERIFICATION DEBUG ===');
        console.log('User ID:', userId);

        // Get student profile to access avatarUrl
        const studentProfile = await this.prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!studentProfile) {
            throw new HttpException('Student profile not found', HttpStatus.NOT_FOUND);
        }

        if (!studentProfile.avatarUrl) {
            throw new HttpException('User has no avatar. Please upload an avatar first.', HttpStatus.BAD_REQUEST);
        }

        const result = await this.callFaceApi(studentProfile.avatarUrl, dto.selfieUrl);

        if (result.verified) {
            // Update faceRegistered status
            await this.prisma.studentProfile.update({
                where: { id: studentProfile.id },
                data: { faceRegistered: true },
            });
            console.log('User face registered/verified successfully');
        }

        return result;
    }

    /**
     * Verify face for Attendance Check-in (App sends Base64)
     */
    async verifyAttendance(studentCode: string, imageBase64: string) {
        console.log('=== ATTENDANCE VERIFICATION DEBUG ===');
        console.log('Student Code:', studentCode);

        // 1. Get Student Profile
        const studentProfile = await this.prisma.studentProfile.findUnique({
            where: { studentCode },
        });

        if (!studentProfile) {
            throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
        }

        if (!studentProfile.avatarUrl) {
            throw new HttpException('Student has no avatar registered', HttpStatus.BAD_REQUEST);
        }

        // 2. Upload Base64 to Cloudinary to get URL (or temp URL)
        // Note: For speed, we might want to send base64 directly to Python if supported.
        // But current Python API expects URL. So we upload.
        // This might be slow for check-in. Ideally Python API should accept Base64.
        // But for now, let's stick to the URL contract.

        try {
            const checkInImageUrl = await this.cloudinary.uploadBase64Image(imageBase64, 'attendance_checkins');

            // 3. Call Python API
            const result = await this.callFaceApi(studentProfile.avatarUrl, checkInImageUrl);

            return {
                matched: result.verified,
                score: result.similarity
            };
        } catch (error) {
            console.error('Attendance verification failed:', error);
            return {
                matched: false,
                score: 0
            };
        }
    }

    private async callFaceApi(image1Url: string, image2Url: string) {
        try {
            console.log('Calling FastAPI with:', {
                image1_url: image1Url,
                image2_url: image2Url,
            });

            const response = await axios.post(`${this.faceApiUrl}/api/compare-faces`, {
                image1_url: image1Url,
                image2_url: image2Url,
            });

            console.log('FastAPI response:', response.data);
            return response.data; // { verified: bool, similarity: float, ... }

        } catch (error) {
            console.error('Face API error:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                throw new HttpException(
                    error.response.data.detail || 'Face verification failed',
                    error.response.status,
                );
            }
            throw new HttpException(
                'Failed to connect to face verification service',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }
}
