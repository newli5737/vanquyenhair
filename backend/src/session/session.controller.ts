import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ClassEnrollmentStatus } from '@prisma/client';

@Controller()
export class SessionController {
    constructor(private sessionService: SessionService) { }

    // Admin endpoints
    @Post('admin/sessions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async createSession(@Body() createSessionDto: CreateSessionDto) {
        return this.sessionService.createSession(createSessionDto);
    }

    @Get('admin/sessions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async getSessionsByDate(@Query('date') date: string, @Query('classId') classId?: string) {
        return this.sessionService.getSessionsByDate(date, classId);
    }

    @Put('admin/sessions/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async updateSession(@Param('id') id: string, @Body() createSessionDto: CreateSessionDto) {
        return this.sessionService.updateSession(id, createSessionDto);
    }

    @Delete('admin/sessions/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async deleteSession(@Param('id') id: string) {
        return this.sessionService.deleteSession(id);
    }

    // Student endpoints
    @Get('sessions/today')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async getTodaySessions(@Request() req, @Query('registeredOnly') registeredOnly?: string) {
        const isRegisteredOnly = registeredOnly === 'true';

        const studentProfile = await this.sessionService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });

        if (!studentProfile) {
            throw new Error('Student profile not found');
        }

        if (isRegisteredOnly) {
            // Get today's sessions that the student has REGISTERED for
            const registrations = await this.sessionService['prisma'].sessionRegistration.findMany({
                where: {
                    studentId: studentProfile.id,
                },
                include: {
                    session: true
                }
            });

            // Filter for sessions that are actually TODAY
            const today = new Date().toISOString().split('T')[0];
            const registeredSessionIds = registrations
                .filter(r => r.session.date === today)
                .map(r => r.sessionId);

            if (registeredSessionIds.length === 0) {
                return [];
            }

            // Reuse service method but filter by specific session IDs
            const sessions = await this.sessionService.getTodaySessions();
            return sessions.filter(s => registeredSessionIds.includes(s.id));
        } else {
            // Original behavior: Get all sessions for the classes the student is enrolled in
            const enrollments = await this.sessionService['prisma'].classEnrollmentRequest.findMany({
                where: {
                    studentId: studentProfile.id,
                    status: ClassEnrollmentStatus.APPROVED
                },
                select: { trainingClassId: true }
            });

            const classIds = enrollments.map(e => e.trainingClassId);

            const sessions = await this.sessionService.getTodaySessions(classIds.length > 0 ? classIds : undefined);

            // Enrich sessions with registration status for the current student
            const registrations = await this.sessionService['prisma'].sessionRegistration.findMany({
                where: {
                    studentId: studentProfile.id,
                    sessionId: { in: sessions.map(s => s.id) }
                },
                select: { sessionId: true }
            });
            const registeredIds = new Set(registrations.map(r => r.sessionId));

            return sessions.map(s => ({
                ...s,
                isRegistered: registeredIds.has(s.id)
            }));
        }
    }

    @Post('sessions/:id/register')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    async registerForSession(@Param('id') sessionId: string, @Request() req) {
        const studentProfile = await this.sessionService['prisma'].studentProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!studentProfile) {
            throw new Error('Student profile not found');
        }
        return this.sessionService.registerForSession(studentProfile.id, sessionId);
    }
}
