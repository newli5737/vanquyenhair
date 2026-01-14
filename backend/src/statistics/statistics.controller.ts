import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class StatisticsController {
    constructor(private statisticsService: StatisticsService) { }

    @Get('overview')
    async getOverallStats(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('classId') classId?: string,
    ) {
        return this.statisticsService.getOverallStats(startDate, endDate, classId);
    }

    @Get('weekly-absence')
    async getWeeklyAbsenceStats(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('classId') classId?: string,
    ) {
        return this.statisticsService.getWeeklyAbsenceStats(startDate, endDate, classId);
    }

    @Get('far-checkins')
    async getFarCheckInStats(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('classId') classId?: string,
    ) {
        return this.statisticsService.getFarCheckInStats(startDate, endDate, classId);
    }

    @Get('attendance-matrix')
    async getAttendanceMatrix(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('classId') classId: string,
    ) {
        return this.statisticsService.getAttendanceMatrix(startDate, endDate, classId);
    }
}
