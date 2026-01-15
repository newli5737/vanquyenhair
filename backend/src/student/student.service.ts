import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

import { AuthService } from '../auth/auth.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { Role } from '@prisma/client';

@Injectable()
export class StudentService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
        private authService: AuthService,
    ) { }

    async createStudent(createStudentDto: CreateStudentDto) {
        // Check if email or studentCode already exists
        if (createStudentDto.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: createStudentDto.email },
            });

            if (existingUser) {
                throw new ConflictException('Email đã tồn tại');
            }
        }

        if (!createStudentDto.studentCode) {
            const profiles = await this.prisma.studentProfile.findMany({
                where: { studentCode: { startsWith: 'S' } },
                select: { studentCode: true }
            });

            let maxNumber = 0;
            profiles.forEach(p => {
                const numPart = p.studentCode.substring(1);
                if (/^\d+$/.test(numPart)) {
                    const num = parseInt(numPart);
                    if (num > maxNumber) maxNumber = num;
                }
            });
            createStudentDto.studentCode = `S${(maxNumber + 1).toString().padStart(4, '0')}`;
        } else {
            const existingStudent = await this.prisma.studentProfile.findUnique({
                where: { studentCode: createStudentDto.studentCode },
            });

            if (existingStudent) {
                throw new ConflictException('Mã học viên đã tồn tại');
            }
        }

        // Hash password
        const passwordHash = await this.authService.hashPassword(createStudentDto.password);

        // Create user and student profile
        // Create user and student profile
        const user = await this.prisma.user.create({
            data: {
                email: createStudentDto.email,
                phone: createStudentDto.phone, // Save phone to User
                passwordHash,
                role: Role.STUDENT,
                studentProfile: {
                    create: {
                        studentCode: createStudentDto.studentCode,
                        fullName: createStudentDto.fullName,
                        // phone removed from StudentProfile
                    } as any, // Cast as any to bypass TS error if client is not regenerated
                },
            },
            include: {
                studentProfile: true,
            },
        });

        // Upload avatar if provided
        let avatarUrl = createStudentDto.avatarUrl;

        if (createStudentDto.avatarBase64) {
            avatarUrl = await this.cloudinary.uploadBase64Image(
                createStudentDto.avatarBase64,
                'avatars',
            );
        }

        if (avatarUrl) {
            if (!user.studentProfile) {
                throw new Error('Failed to create student profile');
            }

            await this.prisma.studentProfile.update({
                where: { id: user.studentProfile.id },
                data: {
                    avatarUrl,
                    faceRegistered: true
                },
            });
        }

        if (!user.studentProfile) {
            throw new Error('Failed to create student profile');
        }

        return this.getStudentById(user.studentProfile.id);
    }

    async updateStudent(id: string, updateStudentDto: UpdateStudentDto) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy học viên');
        }

        const updateData: any = {};

        if (updateStudentDto.fullName) {
            updateData.fullName = updateStudentDto.fullName;
        }

        if (updateStudentDto.identityCardImage) {
            const cccdUrl = await this.cloudinary.uploadBase64Image(
                updateStudentDto.identityCardImage,
                'identity_cards',
            );
            updateData.identityCardImage = cccdUrl;
        }

        if (updateStudentDto.avatarUrl) {
            // Direct URL provided (e.g., from Cloudinary upload in frontend)
            updateData.avatarUrl = updateStudentDto.avatarUrl;
        } else if (updateStudentDto.avatarBase64) {
            // Base64 provided - upload to Cloudinary
            const avatarUrl = await this.cloudinary.uploadBase64Image(
                updateStudentDto.avatarBase64,
                'avatars',
            );
            updateData.avatarUrl = avatarUrl;

            // Auto-register face when avatar is uploaded
            updateData.faceRegistered = true;
        }

        // Handle User-specific fields (Email, Phone, Password)
        if (updateStudentDto.email || updateStudentDto.phone || updateStudentDto.password) {
            const userUpdateData: any = {};

            if (updateStudentDto.phone) {
                userUpdateData.phone = updateStudentDto.phone;
            }

            if (updateStudentDto.email) {
                // Check if email already exists for another user
                const existingUser = await this.prisma.user.findFirst({
                    where: {
                        email: updateStudentDto.email,
                        NOT: { id: student.userId }
                    },
                });

                if (existingUser) {
                    throw new ConflictException('Email đã tồn tại');
                }
                userUpdateData.email = updateStudentDto.email;
            }

            if (updateStudentDto.password) {
                userUpdateData.passwordHash = await this.authService.hashPassword(updateStudentDto.password);
            }

            await this.prisma.user.update({
                where: { id: student.userId },
                data: userUpdateData,
            });
        }

        await this.prisma.studentProfile.update({
            where: { id },
            data: updateData,
        });

        return this.getStudentById(id);
    }

    async getAllStudents() {
        const students = await this.prisma.studentProfile.findMany({
            include: {
                user: {
                    select: {
                        email: true,
                        phone: true, // Select phone from user
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                user: {
                    createdAt: 'desc',
                },
            },
        });

        // Map phone to top level
        return students.map(student => ({
            ...student,
            phone: student.user.phone || '',
        }));
    }

    async getStudentById(id: string) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy học viên');
        }

        return {
            ...student,
            phone: student.user.phone || '',
        };
    }

    async getStudentByUserId(userId: string) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        role: true,
                    },
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy học viên');
        }

        return {
            ...student,
            phone: student.user.phone || '',
        };
    }

    async deleteStudent(id: string) {
        const student = await this.prisma.studentProfile.findUnique({ where: { id } });
        if (!student) {
            throw new NotFoundException('Không tìm thấy học viên');
        }
        await this.prisma.user.delete({
            where: { id: student.userId },
        });
        return { message: 'Xóa học viên thành công' };
    }
}
