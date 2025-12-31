import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class AttendanceController {
    constructor(private attendanceService: AttendanceService) { }

    // Student endpoints
    @Post('attendance/check-in')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async checkIn(@Body() checkInDto: CheckInDto, @Request() req) {
        const studentProfile = await this.attendanceService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!studentProfile) {
            throw new Error('Student profile not found');
        }
        return this.attendanceService.checkIn(studentProfile.id, checkInDto);
    }

    @Post('attendance/check-out')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async checkOut(@Body() checkOutDto: CheckOutDto, @Request() req) {
        const studentProfile = await this.attendanceService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!studentProfile) {
            throw new Error('Student profile not found');
        }
        return this.attendanceService.checkOut(studentProfile.id, checkOutDto);
    }

    // Admin endpoints
    @Get('admin/attendance')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async getAttendanceRecords(
        @Query('date') date?: string,
        @Query('sessionId') sessionId?: string,
    ) {
        return this.attendanceService.getAttendanceRecords(date, sessionId);
    }

    @Delete('admin/attendance/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async deleteAttendance(@Param('id') id: string) {
        return this.attendanceService.deleteAttendance(id);
    }

    @Delete('admin/attendance/:id/check-in')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async deleteCheckIn(@Param('id') id: string) {
        return this.attendanceService.deleteCheckIn(id);
    }

    @Delete('admin/attendance/:id/check-out')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async deleteCheckOut(@Param('id') id: string) {
        return this.attendanceService.deleteCheckOut(id);
    }

    @Get('student/attendance')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async getMyAttendance(@Request() req) {
        console.log('Request User:', JSON.stringify(req.user, null, 2));
        const studentProfile = await this.attendanceService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!studentProfile) {
            throw new Error('Student profile not found');
        }

        // Use a new service method or reuse existing findMany with filters
        const history = await this.attendanceService['prisma'].attendance.findMany({
            where: { studentId: studentProfile.id },
            include: {
                session: true,
            },
            orderBy: {
                checkInTime: 'desc',
            },
        });
        console.log('Sending History Data:', JSON.stringify(history, null, 2));
        return history;
    }
}
