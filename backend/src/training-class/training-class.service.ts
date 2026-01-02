import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TrainingClassService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const classes = await this.prisma.trainingClass.findMany({
            include: {
                _count: {
                    select: {
                        enrollmentRequests: {
                            where: { status: 'PENDING' }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return classes.map(cls => ({
            ...cls,
            pendingCount: cls._count.enrollmentRequests
        }));
    }

    async getAvailableClasses() {
        const classes = await this.prisma.trainingClass.findMany({
            include: {
                _count: {
                    select: {
                        enrollmentRequests: {
                            where: { status: 'APPROVED' }
                        }
                    }
                }
            },
            orderBy: [
                { year: 'desc' },
                { name: 'asc' }
            ]
        });

        return classes.map(cls => ({
            ...cls,
            studentCount: cls._count.enrollmentRequests
        }));
    }

    async create(data: any) {
        try {
            console.log('Creating training class with data:', data);

            // Auto-generate code: T + timestamp (last 6 digits)
            const timestamp = Date.now().toString().slice(-6);
            const code = `TC${timestamp}`;

            return await this.prisma.trainingClass.create({
                data: {
                    code: code,
                    name: data.name,
                    type: data.type,
                    location: data.location,
                    year: data.year,
                    latitude: data.latitude,
                    longitude: data.longitude,
                }
            });
        } catch (error) {
            console.error('Error creating training class:', error);
            throw error;
        }
    }

    async findOne(id: string) {
        return this.prisma.trainingClass.findUnique({
            where: { id }
        });
    }
    async update(id: string, data: any) {
        return this.prisma.trainingClass.update({
            where: { id },
            data: {
                // code is immutable
                name: data.name,
                type: data.type,
                location: data.location,
                year: data.year,
                latitude: data.latitude,
                longitude: data.longitude,
            }
        });
    }

    async remove(id: string) {
        return this.prisma.trainingClass.delete({
            where: { id }
        });
    }

    async removeStudentFromClass(classId: string, studentId: string) {
        // Use transaction to ensure all deletions happen atomically
        return this.prisma.$transaction(async (tx) => {
            // Get all sessions of this class
            const sessions = await tx.classSession.findMany({
                where: { trainingClassId: classId },
                select: { id: true },
            });

            const sessionIds = sessions.map(s => s.id);

            // Delete all attendances for this student in this class
            if (sessionIds.length > 0) {
                await tx.attendance.deleteMany({
                    where: {
                        studentId,
                        sessionId: { in: sessionIds },
                    },
                });

                // Delete all session registrations for this student in this class
                await tx.sessionRegistration.deleteMany({
                    where: {
                        studentId,
                        sessionId: { in: sessionIds },
                    },
                });
            }

            // Delete enrollment request
            await tx.classEnrollmentRequest.deleteMany({
                where: {
                    studentId,
                    trainingClassId: classId,
                },
            });

            return {
                message: 'Đã xóa học viên khỏi lớp học thành công',
                deletedRecords: {
                    enrollments: 1,
                    sessionRegistrations: sessionIds.length,
                    attendances: sessionIds.length,
                },
            };
        });
    }
}
