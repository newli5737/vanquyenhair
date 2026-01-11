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

    /**
     * Tự động tìm ca học phù hợp cho student check-in
     * Logic:
     * 1. Lấy danh sách lớp học student đã được approved
     * 2. Tìm session trong ngày hôm nay:
     *    - Trong khoảng thời gian cho phép (startTime - 30 phút → endTime + 30 phút)
     *    - Ưu tiên session có isAutoSelected = true
     * 3. Nếu có nhiều session → chọn session gần nhất với thời gian hiện tại
     * 4. Trả về sessionId hoặc throw error nếu không tìm thấy
     */
    async findCurrentSession(studentId: string, trainingClassId?: string): Promise<string> {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentTime = this.formatTime(now);

        // 1. Lấy các lớp học student đã được approved
        const enrollments = await this.prisma.classEnrollmentRequest.findMany({
            where: {
                studentId,
                status: 'APPROVED',
                ...(trainingClassId && { trainingClassId }),
            },
            select: {
                trainingClassId: true,
            },
        });

        if (enrollments.length === 0) {
            throw new BadRequestException(
                trainingClassId
                    ? 'Bạn chưa được duyệt vào lớp học này'
                    : 'Bạn chưa được duyệt vào lớp học nào'
            );
        }

        const classIds = enrollments.map(e => e.trainingClassId);

        // 2. Tìm session phù hợp (trong khoảng ±30 phút)
        const sessions = await this.prisma.classSession.findMany({
            where: {
                trainingClassId: { in: classIds },
                date: today,
                isDeleted: false,
            },
            orderBy: [
                { isAutoSelected: 'desc' }, // Ưu tiên ca được đánh dấu
                { startTime: 'asc' },       // Ưu tiên ca sớm nhất
            ],
        });

        if (sessions.length === 0) {
            throw new BadRequestException('Không có ca học nào trong ngày hôm nay');
        }

        // 3. Filter sessions trong khoảng thời gian cho phép (±30 phút)
        const validSessions = sessions.filter(session => {
            const startMinusBuffer = this.subtractMinutes(session.startTime, 30);
            const endPlusBuffer = this.addMinutes(session.endTime, 30);

            return this.isTimeInRange(currentTime, startMinusBuffer, endPlusBuffer);
        });

        if (validSessions.length === 0) {
            throw new BadRequestException(
                'Không có ca học nào khả dụng trong thời gian này. Vui lòng điểm danh trong khoảng 30 phút trước/sau giờ học.'
            );
        }

        // 4. Chọn session gần nhất (hoặc auto-selected nếu có)
        const nearestSession = validSessions.reduce((prev, curr) => {
            // Ưu tiên auto-selected
            if (curr.isAutoSelected && !prev.isAutoSelected) return curr;
            if (!curr.isAutoSelected && prev.isAutoSelected) return prev;

            // Nếu cùng mức ưu tiên, chọn gần thời gian hiện tại nhất
            const prevDiff = Math.abs(this.timeDiffInMinutes(currentTime, prev.startTime));
            const currDiff = Math.abs(this.timeDiffInMinutes(currentTime, curr.startTime));
            return currDiff < prevDiff ? curr : prev;
        });

        // 5. Kiểm tra đã điểm danh chưa
        const existingAttendance = await this.prisma.attendance.findUnique({
            where: {
                studentId_sessionId: {
                    studentId,
                    sessionId: nearestSession.id,
                },
            },
        });

        if (existingAttendance && existingAttendance.checkInTime) {
            throw new BadRequestException('Bạn đã điểm danh ca học này rồi');
        }

        return nearestSession.id;
    }

    // Helper: Format Date to HH:mm
    private formatTime(date: Date): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Helper: Check if time is in range
    private isTimeInRange(time: string, start: string, end: string): boolean {
        const timeMinutes = this.timeToMinutes(time);
        const startMinutes = this.timeToMinutes(start);
        const endMinutes = this.timeToMinutes(end);

        // Handle cases where range crosses midnight
        if (endMinutes < startMinutes) {
            return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
        }

        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    }

    // Helper: Convert HH:mm to minutes since midnight
    private timeToMinutes(time: string): number {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    }

    // Helper: Calculate time difference in minutes
    private timeDiffInMinutes(time1: string, time2: string): number {
        return this.timeToMinutes(time1) - this.timeToMinutes(time2);
    }

    // Helper: Add minutes to time string
    private addMinutes(time: string, minutes: number): string {
        const totalMinutes = this.timeToMinutes(time) + minutes;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    // Helper: Subtract minutes from time string
    private subtractMinutes(time: string, minutes: number): string {
        return this.addMinutes(time, -minutes);
    }

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

        // 1. Tự động tìm session phù hợp (nếu không có sessionId)
        const sessionId = checkInDto.sessionId || await this.findCurrentSession(studentId, checkInDto.trainingClassId);

        const session = await this.prisma.classSession.findUnique({
            where: { id: sessionId },
            include: {
                trainingClass: true, // Include class to get coordinates
            },
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

        // Calculate location note
        let locationNote: string | null = null;
        if (session.trainingClass && session.trainingClass.latitude && session.trainingClass.longitude) {
            // Check if check-in location is provided
            if (checkInDto.lat && checkInDto.lng) {
                // Calculate distance using Haversine formula
                const distance = this.calculateDistance(
                    checkInDto.lat,
                    checkInDto.lng,
                    session.trainingClass.latitude,
                    session.trainingClass.longitude,
                );

                if (distance > 100) {
                    locationNote = `Vị trí xa lớp học (${distance.toFixed(0)}m)`;
                }
            } else {
                locationNote = 'Chưa có vị trí check-in';
            }
        } else {
            locationNote = 'Chưa có vị trí lớp học';
        }

        // Check if attendance record exists
        let attendance = await this.prisma.attendance.findUnique({
            where: {
                studentId_sessionId: {
                    studentId,
                    sessionId: sessionId,
                },
            },
        });

        const checkInTime = new Date();
        // Đơn giản hóa status: chỉ PRESENT hoặc ABSENT
        const status = AttendanceStatus.PRESENT;

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
                    locationNote,
                    status,
                },
            });
        } else {
            // Create new record
            attendance = await this.prisma.attendance.create({
                data: {
                    studentId,
                    sessionId: sessionId,
                    checkInTime,
                    checkInLat: checkInDto.lat,
                    checkInLng: checkInDto.lng,
                    checkInFaceScore: faceResult.score,
                    checkInImageUrl: faceResult.imageUrl,
                    locationNote,
                    status,
                },
            });
        }

        // Trả về kèm thông tin session để frontend hiển thị
        return {
            success: true,
            message: 'Điểm danh thành công',
            data: {
                attendance,
                session: {
                    id: session.id,
                    name: session.name,
                    className: session.trainingClass?.name,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    date: session.date,
                },
            },
        };
    }

    // Haversine formula to calculate distance between two coordinates in meters
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
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

    // DEPRECATED: Không còn sử dụng logic tính LATE/LEFT_EARLY
    // Giờ chỉ có PRESENT (đã check-in) hoặc ABSENT (không check-in)
    private calculateStatus(
        checkInTime: Date,
        sessionStartTime: string,
        sessionDate: string,
        checkOutTime?: Date | null,
        sessionEndTime?: string
    ): AttendanceStatus {
        // Đơn giản hóa: có check-in = PRESENT
        return AttendanceStatus.PRESENT;
    }

    async getWeeklyReport(startDate: string, endDate: string, classId?: string) {
        // Get all sessions in the date range
        const where: any = {
            date: {
                gte: startDate,
                lte: endDate,
            },
            isDeleted: false,
        };

        if (classId) {
            where.trainingClassId = classId;
        }

        const sessions = await this.prisma.classSession.findMany({
            where,
            include: {
                trainingClass: true,
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' },
            ],
        });

        // Get all approved enrollments for these classes
        const classIds = [...new Set(sessions.map(s => s.trainingClassId).filter(Boolean))];

        if (classIds.length === 0) {
            return [];
        }

        const enrollments = await this.prisma.classEnrollmentRequest.findMany({
            where: {
                trainingClassId: { in: classIds as string[] },
                status: 'APPROVED',
            },
            include: {
                student: {
                    select: {
                        id: true,
                        studentCode: true,
                        fullName: true,
                    },
                },
                trainingClass: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        // Get all attendances for these sessions
        const sessionIds = sessions.map(s => s.id);
        const attendances = await this.prisma.attendance.findMany({
            where: {
                sessionId: { in: sessionIds },
                checkInTime: { not: null }, // Only count if checked in
            },
            select: {
                studentId: true,
                sessionId: true,
            },
        });

        // Create a map of student-session attendance
        const attendanceMap = new Set(
            attendances.map(a => `${a.studentId}-${a.sessionId}`)
        );

        // Find missing check-ins
        const missingCheckIns: any[] = [];

        for (const enrollment of enrollments) {
            // Get sessions for this student's class
            const classSessions = sessions.filter(
                s => s.trainingClassId === enrollment.trainingClassId
            );

            for (const session of classSessions) {
                const key = `${enrollment.student.id}-${session.id}`;

                // If student didn't check in
                if (!attendanceMap.has(key)) {
                    missingCheckIns.push({
                        studentCode: enrollment.student.studentCode,
                        studentName: enrollment.student.fullName,
                        className: enrollment.trainingClass.name,
                        classCode: enrollment.trainingClass.code,
                        date: session.date,
                        sessionName: session.name,
                        sessionTime: `${session.startTime} - ${session.endTime}`,
                    });
                }
            }
        }

        return missingCheckIns;
    }
}
