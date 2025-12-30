import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClassEnrollmentStatus } from '@prisma/client';

@Injectable()
export class EnrollmentService {
    constructor(private prisma: PrismaService) { }

    async createEnrollmentRequest(studentId: string, trainingClassId: string) {
        // Check if student is already enrolled or has pending request for THIS class
        const existingEnrollment = await this.prisma.classEnrollmentRequest.findFirst({
            where: {
                studentId,
                trainingClassId,
                status: {
                    in: [ClassEnrollmentStatus.PENDING, ClassEnrollmentStatus.APPROVED]
                }
            },
        });

        if (existingEnrollment) {
            if (existingEnrollment.status === ClassEnrollmentStatus.APPROVED) {
                throw new BadRequestException('Bạn đã tham gia lớp học này rồi');
            }
            throw new BadRequestException('Bạn đã có yêu cầu đang chờ duyệt cho lớp này');
        }

        // Check if class exists
        const trainingClass = await this.prisma.trainingClass.findUnique({
            where: { id: trainingClassId },
        });

        if (!trainingClass) {
            throw new NotFoundException('Không tìm thấy lớp học');
        }

        // Create enrollment request
        return this.prisma.classEnrollmentRequest.create({
            data: {
                studentId,
                trainingClassId,
            },
            include: {
                trainingClass: true,
            },
        });
    }

    async getMyEnrollmentRequests(studentId: string) {
        return this.prisma.classEnrollmentRequest.findMany({
            where: { studentId },
            include: {
                trainingClass: true,
                reviewer: {
                    select: {
                        email: true,
                    },
                },
            },
            orderBy: {
                requestedAt: 'desc',
            },
        });
    }

    async getMyEnrolledClasses(studentId: string) {
        const enrollments = await this.prisma.classEnrollmentRequest.findMany({
            where: {
                studentId,
                status: ClassEnrollmentStatus.APPROVED,
            },
            include: {
                trainingClass: true,
            },
            orderBy: {
                reviewedAt: 'desc',
            },
        });

        return enrollments.map(e => e.trainingClass);
    }

    async getPendingRequests(trainingClassId?: string) {
        return this.prisma.classEnrollmentRequest.findMany({
            where: {
                status: ClassEnrollmentStatus.PENDING,
                ...(trainingClassId && { trainingClassId }),
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
                trainingClass: true,
            },
            orderBy: {
                requestedAt: 'asc',
            },
        });
    }

    async getAllRequests(trainingClassId?: string, status?: ClassEnrollmentStatus) {
        return this.prisma.classEnrollmentRequest.findMany({
            where: {
                ...(trainingClassId && { trainingClassId }),
                ...(status && { status }),
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
                trainingClass: true,
                reviewer: {
                    select: {
                        email: true,
                    },
                },
            },
            orderBy: {
                requestedAt: 'desc',
            },
        });
    }

    async reviewRequest(
        requestId: string,
        adminId: string,
        status: 'APPROVED' | 'REJECTED',
        rejectionReason?: string,
    ) {
        const request = await this.prisma.classEnrollmentRequest.findUnique({
            where: { id: requestId },
            include: {
                student: true,
            },
        });

        if (!request) {
            throw new NotFoundException('Không tìm thấy yêu cầu');
        }

        if (request.status !== ClassEnrollmentStatus.PENDING) {
            throw new BadRequestException('Yêu cầu đã được xử lý rồi');
        }

        // Update request
        const updatedRequest = await this.prisma.classEnrollmentRequest.update({
            where: { id: requestId },
            data: {
                status: status === 'APPROVED' ? ClassEnrollmentStatus.APPROVED : ClassEnrollmentStatus.REJECTED,
                reviewedAt: new Date(),
                reviewedBy: adminId,
                rejectionReason: status === 'REJECTED' ? rejectionReason : null,
            },
            include: {
                student: true,
                trainingClass: true,
            },
        });

        return updatedRequest;
    }

    async getClassEnrollmentStats(trainingClassId: string) {
        const [pending, approved, rejected] = await Promise.all([
            this.prisma.classEnrollmentRequest.count({
                where: {
                    trainingClassId,
                    status: ClassEnrollmentStatus.PENDING,
                },
            }),
            this.prisma.classEnrollmentRequest.count({
                where: {
                    trainingClassId,
                    status: ClassEnrollmentStatus.APPROVED,
                },
            }),
            this.prisma.classEnrollmentRequest.count({
                where: {
                    trainingClassId,
                    status: ClassEnrollmentStatus.REJECTED,
                },
            }),
        ]);

        return { pending, approved, rejected };
    }
}
