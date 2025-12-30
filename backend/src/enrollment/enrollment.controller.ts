import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentRequestDto, ReviewEnrollmentDto } from './dto/enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ClassEnrollmentStatus } from '@prisma/client';

@Controller()
export class EnrollmentController {
    constructor(private enrollmentService: EnrollmentService) { }

    // Student endpoints
    @Post('enrollment/request')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async createRequest(@Body() dto: CreateEnrollmentRequestDto, @Request() req) {
        const studentProfile = await this.enrollmentService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!studentProfile) {
            throw new Error('Student profile not found');
        }

        return this.enrollmentService.createEnrollmentRequest(studentProfile.id, dto.trainingClassId);
    }

    @Get('enrollment/my-requests')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async getMyRequests(@Request() req) {
        const studentProfile = await this.enrollmentService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!studentProfile) {
            throw new Error('Student profile not found');
        }

        return this.enrollmentService.getMyEnrollmentRequests(studentProfile.id);
    }

    @Get('enrollment/my-classes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async getMyClasses(@Request() req) {
        const studentProfile = await this.enrollmentService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!studentProfile) {
            throw new Error('Student profile not found');
        }

        return this.enrollmentService.getMyEnrolledClasses(studentProfile.id);
    }

    // Admin endpoints
    @Get('admin/enrollment/requests')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async getAllRequests(
        @Query('classId') classId?: string,
        @Query('status') status?: string,
    ) {
        const enrollmentStatus = status ? (status as ClassEnrollmentStatus) : undefined;
        return this.enrollmentService.getAllRequests(classId, enrollmentStatus);
    }

    @Get('admin/enrollment/pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async getPendingRequests(@Query('classId') classId?: string) {
        return this.enrollmentService.getPendingRequests(classId);
    }

    @Put('admin/enrollment/requests/:id/review')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async reviewRequest(
        @Param('id') id: string,
        @Body() dto: ReviewEnrollmentDto,
        @Request() req,
    ) {
        return this.enrollmentService.reviewRequest(
            id,
            req.user.userId,
            dto.status,
            dto.rejectionReason,
        );
    }

    @Get('admin/enrollment/stats/:classId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async getClassStats(@Param('classId') classId: string) {
        return this.enrollmentService.getClassEnrollmentStats(classId);
    }
}
