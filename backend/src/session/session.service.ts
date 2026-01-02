import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSessionDto } from './dto/session.dto';

@Injectable()
export class SessionService {
    constructor(private prisma: PrismaService) { }

    async createSession(createSessionDto: CreateSessionDto) {
        // Check if there are already 3 sessions on this date for this class
        const existingSessions = await this.prisma.classSession.findMany({
            where: {
                date: createSessionDto.date,
                trainingClassId: createSessionDto.trainingClassId,
                isDeleted: false
            },
        });

        if (existingSessions.length >= 3) {
            throw new BadRequestException('Mỗi ngày chỉ được tạo tối đa 3 ca học cho lớp này');
        }

        // Calculate registration deadline (startTime - 2 hours)
        const [hours, minutes] = createSessionDto.startTime.split(':').map(Number);
        const startDateTime = new Date(`${createSessionDto.date}T${createSessionDto.startTime}:00`);
        const registrationDeadline = new Date(startDateTime.getTime() - 2 * 60 * 60 * 1000);

        return this.prisma.classSession.create({
            data: {
                date: createSessionDto.date,
                name: createSessionDto.name,
                startTime: createSessionDto.startTime,
                endTime: createSessionDto.endTime,
                registrationDeadline,
                trainingClassId: createSessionDto.trainingClassId,
            },
        });
    }

    async getSessionsByDate(date: string, trainingClassId?: string | string[]) {
        const where: any = { date, isDeleted: false };
        if (trainingClassId) {
            if (Array.isArray(trainingClassId)) {
                where.trainingClassId = { in: trainingClassId };
            } else {
                where.trainingClassId = trainingClassId;
            }
        }
        return this.prisma.classSession.findMany({
            where,
            orderBy: { startTime: 'asc' },
            include: {
                trainingClass: true,
            }
        });
    }

    async updateSession(id: string, updateSessionDto: CreateSessionDto) {
        const session = await this.prisma.classSession.findUnique({
            where: { id },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy ca học');
        }

        const [hours, minutes] = updateSessionDto.startTime.split(':').map(Number);
        const startDateTime = new Date(`${updateSessionDto.date}T${updateSessionDto.startTime}:00`);
        const registrationDeadline = new Date(startDateTime.getTime() - 2 * 60 * 60 * 1000);

        return this.prisma.classSession.update({
            where: { id },
            data: {
                date: updateSessionDto.date,
                name: updateSessionDto.name,
                startTime: updateSessionDto.startTime,
                endTime: updateSessionDto.endTime,
                registrationDeadline,
                trainingClassId: updateSessionDto.trainingClassId,
            },
        });
    }

    async deleteSession(id: string) {
        const session = await this.prisma.classSession.findUnique({
            where: { id },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy ca học');
        }

        return this.prisma.classSession.update({
            where: { id },
            data: { isDeleted: true },
        });
    }

    async getTodaySessions(trainingClassId?: string | string[]) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return this.getSessionsByDate(today, trainingClassId);
    }

    async registerForSession(studentId: string, sessionId: string) {
        const session = await this.prisma.classSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Không tìm thấy ca học');
        }

        // Check if registration deadline has passed
        if (new Date() > session.registrationDeadline) {
            throw new BadRequestException('Đã hết hạn đăng ký ca học này');
        }

        // Check if student already registered
        const existing = await this.prisma.sessionRegistration.findUnique({
            where: {
                studentId_sessionId: {
                    studentId,
                    sessionId,
                },
            },
        });

        if (existing) {
            throw new ConflictException('Bạn đã đăng ký ca học này rồi');
        }

        // Check if student already registered for another session on the same date
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: studentId },
            include: {
                sessionRegistrations: {
                    include: {
                        session: true,
                    },
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy học viên');
        }

        const sameDayRegistration = student.sessionRegistrations.find(
            (reg) => reg.session.date === session.date,
        );

        if (sameDayRegistration) {
            throw new ConflictException('Bạn chỉ được đăng ký 1 ca học mỗi ngày');
        }

        return this.prisma.sessionRegistration.create({
            data: {
                studentId,
                sessionId,
            },
        });
    }

    async bulkCreateSessions(bulkDto: any) {
        // Verify training class exists
        const trainingClass = await this.prisma.trainingClass.findUnique({
            where: { id: bulkDto.trainingClassId },
        });

        if (!trainingClass) {
            throw new NotFoundException('Không tìm thấy lớp học');
        }

        // Generate list of dates
        const startDate = new Date(bulkDto.startDate);
        const endDate = new Date(bulkDto.endDate);
        const dates: string[] = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

            // Skip weekends if requested
            if (bulkDto.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
                continue;
            }

            // Skip Saturday only if requested
            if (bulkDto.excludeSaturday && !bulkDto.excludeWeekends && dayOfWeek === 6) {
                continue;
            }

            dates.push(d.toISOString().split('T')[0]);
        }

        // Create sessions in transaction
        const createdSessions = await this.prisma.$transaction(async (tx) => {
            const sessions: any[] = [];

            for (const date of dates) {
                // Check existing sessions for this date
                const existingSessions = await tx.classSession.findMany({
                    where: {
                        date,
                        trainingClassId: bulkDto.trainingClassId,
                        isDeleted: false,
                    },
                });

                // Skip if already has 3 sessions
                if (existingSessions.length >= 3) {
                    continue;
                }

                // Create sessions for this date
                for (const sessionTemplate of bulkDto.sessions) {
                    const startDateTime = new Date(`${date}T${sessionTemplate.startTime}:00`);
                    const registrationDeadline = new Date(startDateTime.getTime() - 2 * 60 * 60 * 1000);

                    const session = await tx.classSession.create({
                        data: {
                            date,
                            name: sessionTemplate.name,
                            startTime: sessionTemplate.startTime,
                            endTime: sessionTemplate.endTime,
                            registrationDeadline,
                            trainingClassId: bulkDto.trainingClassId,
                        },
                    });

                    sessions.push(session);
                }
            }

            return sessions;
        });

        return {
            message: `Đã tạo ${createdSessions.length} ca học thành công`,
            count: createdSessions.length,
            sessions: createdSessions,
        };
    }
}
