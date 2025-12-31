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
                    checkInImageUrl: faceResult.imageUrl,
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
                    checkInImageUrl: faceResult.imageUrl,
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
            include: { session: true },
        });

        if (!attendance) {
            throw new NotFoundException('Bạn chưa check-in cho ca học này');
        }

        if (attendance.checkOutTime) {
            throw new BadRequestException('Bạn đã check-out rồi');
        }

        const checkOutTime = new Date();
        const status = this.calculateStatus(
            attendance.checkInTime!, // ensure it's not null, validated above logic implies existence or schema enforcement
            attendance.session.startTime,
            attendance.session.date,
            checkOutTime,
            attendance.session.endTime
        );

        return this.prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime: checkOutTime,
                checkOutLat: checkOutDto.lat,
                checkOutLng: checkOutDto.lng,
                checkOutFaceScore: faceResult.score,
                checkOutImageUrl: faceResult.imageUrl,
                status: status,
            },
        });
    }

    async deleteAttendance(id: string) {
        return this.prisma.attendance.delete({
            where: { id },
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

    async deleteCheckIn(id: string) {
        return this.prisma.attendance.update({
            where: { id },
            data: {
                checkInTime: null,
                checkInLat: null,
                checkInLng: null,
                checkInFaceScore: null,
                checkInImageUrl: null,
                status: AttendanceStatus.ABSENT // Reset status if check-in is removed
            }
        });
    }

    async deleteCheckOut(id: string) {
        // First get the attendance to check current check-in time for status recalculation
        const attendance = await this.prisma.attendance.findUnique({
            where: { id },
            include: { session: true }
        });

        if (!attendance) throw new Error("Attendance not found");

        let newStatus = attendance.status;
        // If there's a check-in time, recalculate status based ONLY on check-in
        if (attendance.checkInTime) {
            const checkInStatus = this.calculateStatus(
                attendance.checkInTime,
                attendance.session.startTime,
                attendance.session.date,
                null, // No checkout time
                attendance.session.endTime
            );
            newStatus = checkInStatus;
        }

        return this.prisma.attendance.update({
            where: { id },
            data: {
                checkOutTime: null,
                checkOutLat: null,
                checkOutLng: null,
                checkOutFaceScore: null,
                checkOutImageUrl: null,
                status: newStatus
            }
        });
    }

    private calculateStatus(
        checkInTime: Date,
        sessionStartTime: string,
        sessionDate: string,
        checkOutTime?: Date | null,
        sessionEndTime?: string
    ): AttendanceStatus {
        const startDateTime = new Date(`${sessionDate}T${sessionStartTime}:00`);

        // Base status based on Check-in
        let status: AttendanceStatus = AttendanceStatus.PRESENT;
        if (checkInTime > startDateTime) {
            status = AttendanceStatus.LATE;
        }

        // Refine status based on Check-out
        if (checkOutTime && sessionEndTime) {
            const endDateTime = new Date(`${sessionDate}T${sessionEndTime}:00`);
            // Allow 5 minutes buffer for early leave? Or strict? Let's be strict for now as requested.
            if (checkOutTime < endDateTime) {
                // Prioritize LEFT_EARLY over LATE? Or just set LEFT_EARLY? 
                // User asked: "sớm trước giờ của ca thì trạng thái là về sớm".
                status = AttendanceStatus.LEFT_EARLY;
            }
        }

        return status;
    }
}
