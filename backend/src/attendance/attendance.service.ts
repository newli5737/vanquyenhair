import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FaceVerificationService } from '../face-service/face-service.service';
import { CheckInDto, CheckOutDto } from './dto/attendance.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        private prisma: PrismaService,
        private faceService: FaceVerificationService,
    ) { }

    async checkIn(studentId: string, checkInDto: CheckInDto) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy học viên');
        }

        if (!student.faceRegistered) {
            throw new BadRequestException('Bạn chưa đăng ký khuôn mặt');
        }

        const session = await this.prisma.classSession.findUnique({
            where: { id: checkInDto.sessionId },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy ca học');
        }

        // Verify face
        const faceResult = await this.faceService.verifyAttendance(
            student.studentCode,
            checkInDto.imageBase64,
        );

        if (!faceResult.matched || faceResult.score < 0.7) {
            throw new BadRequestException(`Khuôn mặt không khớp (Độ chính xác: ${(faceResult.score * 100).toFixed(1)}%). Vui lòng thử lại.`);
        }

        // Check if attendance record exists
        let attendance = await this.prisma.attendance.findUnique({
            where: {
                studentId_sessionId: {
                    studentId,
                    sessionId: checkInDto.sessionId,
                },
            },
        });

        const checkInTime = new Date();
        const status = this.calculateStatus(checkInTime, session.startTime, session.date);

        if (attendance) {
            // Update existing record
            attendance = await this.prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkInTime,
                    checkInLat: checkInDto.lat,
                    checkInLng: checkInDto.lng,
                    checkInFaceScore: faceResult.score,
                    status,
                },
            });
        } else {
            // Create new record
            attendance = await this.prisma.attendance.create({
                data: {
                    studentId,
                    sessionId: checkInDto.sessionId,
                    checkInTime,
                    checkInLat: checkInDto.lat,
                    checkInLng: checkInDto.lng,
                    checkInFaceScore: faceResult.score,
                    status,
                },
            });
        }

        return attendance;
    }

    async checkOut(studentId: string, checkOutDto: CheckOutDto) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy học viên');
        }

        // Verify face
        const faceResult = await this.faceService.verifyAttendance(
            student.studentCode,
            checkOutDto.imageBase64,
        );

        if (!faceResult.matched || faceResult.score < 0.7) {
            throw new BadRequestException(`Khuôn mặt không khớp (Độ chính xác: ${(faceResult.score * 100).toFixed(1)}%). Vui lòng thử lại.`);
        }

        const attendance = await this.prisma.attendance.findUnique({
            where: {
                studentId_sessionId: {
                    studentId,
                    sessionId: checkOutDto.sessionId,
                },
            },
        });

        if (!attendance) {
            throw new NotFoundException('Bạn chưa check-in cho ca học này');
        }

        if (attendance.checkOutTime) {
            throw new BadRequestException('Bạn đã check-out rồi');
        }

        return this.prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime: new Date(),
                checkOutLat: checkOutDto.lat,
                checkOutLng: checkOutDto.lng,
                checkOutFaceScore: faceResult.score,
            },
        });
    }

    async getAttendanceRecords(date?: string, sessionId?: string) {
        const where: any = {};

        if (date) {
            where.session = { date };
        }

        if (sessionId) {
            where.sessionId = sessionId;
        }

        return this.prisma.attendance.findMany({
            where,
            include: {
                student: {
                    select: {
                        studentCode: true,
                        fullName: true,
                    },
                },
                session: {
                    select: {
                        date: true,
                        name: true,
                        startTime: true,
                        endTime: true,
                    },
                },
            },
            orderBy: {
                checkInTime: 'desc',
            },
        });
    }

    private calculateStatus(checkInTime: Date, sessionStartTime: string, sessionDate: string): AttendanceStatus {
        const [hours, minutes] = sessionStartTime.split(':').map(Number);
        const startDateTime = new Date(`${sessionDate}T${sessionStartTime}:00`);

        if (checkInTime <= startDateTime) {
            return AttendanceStatus.PRESENT;
        } else if (checkInTime.getTime() - startDateTime.getTime() <= 15 * 60 * 1000) {
            // Within 15 minutes late
            return AttendanceStatus.LATE;
        } else {
            return AttendanceStatus.ABSENT;
        }
    }
}
