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
                    year: data.year
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
                year: data.year
            }
        });
    }

    async remove(id: string) {
        return this.prisma.trainingClass.delete({
            where: { id }
        });
    }
}
