import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class StatisticsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Thống kê học viên vắng mặt trong tuần
     * 1 ngày học viên chỉ cần check-in 1 ca trong 3 ca là được tính có mặt
     */
    async getWeeklyAbsenceStats(startDate: string, endDate: string, classId?: string) {
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
                trainingClass: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        // Get all enrolled students for the class(es)
        const classIds = classId
            ? [classId]
            : [...new Set(sessions.map(s => s.trainingClassId).filter(Boolean))] as string[];

        const enrolledStudents = await this.prisma.classEnrollmentRequest.findMany({
            where: {
                trainingClassId: { in: classIds },
                status: 'APPROVED',
            },
            include: {
                student: {
                    select: {
                        id: true,
                        studentCode: true,
                        fullName: true,
                        avatarUrl: true,
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

        // Get all attendances in the date range
        const sessionIds = sessions.map(s => s.id);
        const attendances = await this.prisma.attendance.findMany({
            where: {
                sessionId: { in: sessionIds },
                checkInTime: { not: null }, // Only count if they checked in
            },
            select: {
                studentId: true,
                sessionId: true,
                checkInTime: true,
                session: {
                    select: {
                        date: true,
                    },
                },
            },
        });

        // Group sessions by date
        const sessionsByDate = sessions.reduce((acc, session) => {
            if (!acc[session.date]) {
                acc[session.date] = [];
            }
            acc[session.date].push(session.id);
            return acc;
        }, {} as Record<string, string[]>);

        // Calculate absence days for each student
        const absenceStats = enrolledStudents.map((enrollment: any) => {
            const studentId = enrollment.student.id;
            let absentDays = 0;
            let totalDays = 0;

            // For each date, check if student attended at least one session
            Object.entries(sessionsByDate).forEach(([date, sessionIdsForDate]) => {
                totalDays++;
                const hasAttendance = attendances.some(
                    att => att.studentId === studentId && sessionIdsForDate.includes(att.sessionId)
                );
                if (!hasAttendance) {
                    absentDays++;
                }
            });

            return {
                student: enrollment.student,
                class: enrollment.trainingClass,
                absentDays,
                totalDays,
                attendanceRate: totalDays > 0 ? ((totalDays - absentDays) / totalDays) * 100 : 0,
            };
        });

        // Sort by most absent days
        absenceStats.sort((a, b) => b.absentDays - a.absentDays);

        return {
            startDate,
            endDate,
            totalDays: Object.keys(sessionsByDate).length,
            students: absenceStats,
        };
    }

    /**
     * Thống kê học viên check-in xa lớp (dựa vào locationNote)
     */
    async getFarCheckInStats(startDate: string, endDate: string, classId?: string) {
        const where: any = {
            checkInTime: { not: null },
            locationNote: { contains: 'xa lớp học' }, // Filter for far location notes
            session: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                isDeleted: false,
            },
        };

        if (classId) {
            where.session.trainingClassId = classId;
        }

        const farCheckIns = await this.prisma.attendance.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        studentCode: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
                session: {
                    include: {
                        trainingClass: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                checkInTime: 'desc',
            },
        });

        // Group by student and count far check-ins
        const studentStats = farCheckIns.reduce((acc, attendance) => {
            const studentId = attendance.student.id;

            if (!acc[studentId]) {
                acc[studentId] = {
                    student: attendance.student,
                    class: attendance.session.trainingClass,
                    farCheckIns: [],
                    totalFarCheckIns: 0,
                };
            }

            // Extract distance from locationNote (e.g., "Vị trí xa lớp học (523m)")
            const distanceMatch = attendance.locationNote?.match(/\((\d+)m\)/);
            const distance = distanceMatch ? parseInt(distanceMatch[1]) : 0;

            acc[studentId].farCheckIns.push({
                date: attendance.session.date,
                sessionName: attendance.session.name,
                checkInTime: attendance.checkInTime,
                locationNote: attendance.locationNote,
                distance,
            });
            acc[studentId].totalFarCheckIns++;

            return acc;
        }, {} as Record<string, any>);

        // Convert to array and calculate max/average distance
        const stats = Object.values(studentStats).map((stat: any) => {
            const distances = stat.farCheckIns.map((fc: any) => fc.distance);
            const maxDistance = Math.max(...distances);
            const avgDistance = distances.reduce((sum: number, d: number) => sum + d, 0) / distances.length;

            return {
                ...stat,
                maxDistance,
                avgDistance: Math.round(avgDistance),
            };
        });

        // Sort by most far check-ins
        stats.sort((a, b) => b.totalFarCheckIns - a.totalFarCheckIns);

        return {
            startDate,
            endDate,
            totalFarCheckIns: farCheckIns.length,
            students: stats,
        };
    }

    /**
     * Get overall statistics summary
     */
    async getOverallStats(startDate: string, endDate: string, classId?: string) {
        const where: any = {
            session: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                isDeleted: false,
            },
        };

        if (classId) {
            where.session.trainingClassId = classId;
        }

        // Total attendances
        const totalAttendances = await this.prisma.attendance.count({
            where: {
                ...where,
                checkInTime: { not: null },
            },
        });

        // Total sessions
        const totalSessions = await this.prisma.classSession.count({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                isDeleted: false,
                ...(classId && { trainingClassId: classId }),
            },
        });

        // Present count (simplified - no more late tracking)
        const presentCount = await this.prisma.attendance.count({
            where: {
                ...where,
                status: 'PRESENT',
            },
        });

        // Absent count
        const absentCount = await this.prisma.attendance.count({
            where: {
                ...where,
                status: 'ABSENT',
            },
        });

        // Far check-ins
        const farCheckInCount = await this.prisma.attendance.count({
            where: {
                ...where,
                locationNote: { contains: 'xa lớp học' },
            },
        });

        return {
            startDate,
            endDate,
            totalSessions,
            totalAttendances,
            presentCount,
            absentCount,
            farCheckInCount,
            presentRate: totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0,
            absentRate: totalAttendances > 0 ? (absentCount / totalAttendances) * 100 : 0,
            farCheckInRate: totalAttendances > 0 ? (farCheckInCount / totalAttendances) * 100 : 0,
        };
    }

    /**
     * Get attendance matrix: students x dates with attendance status
     * Returns a table-like structure for easy visualization
     */
    async getAttendanceMatrix(startDate: string, endDate: string, classId: string) {
        // Get all sessions in date range for the class
        const sessions = await this.prisma.classSession.findMany({
            where: {
                trainingClassId: classId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                isDeleted: false,
            },
            orderBy: {
                date: 'asc',
            },
            select: {
                id: true,
                date: true,
                name: true,
            },
        });

        // Group sessions by date (multiple sessions per day)
        const dateMap = new Map<string, string[]>();
        sessions.forEach(session => {
            if (!dateMap.has(session.date)) {
                dateMap.set(session.date, []);
            }
            dateMap.get(session.date)!.push(session.id);
        });

        const dates = Array.from(dateMap.keys()).sort();
        const sessionIdsByDate = Array.from(dateMap.values());

        // Get all enrolled students in this class
        const enrolledStudents = await this.prisma.classEnrollmentRequest.findMany({
            where: {
                trainingClassId: classId,
                status: 'APPROVED',
            },
            include: {
                student: {
                    select: {
                        id: true,
                        studentCode: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: {
                student: {
                    studentCode: 'asc',
                },
            },
            select: {
                student: true,
                approvedAt: true,
                createdAt: true,
            },
        });

        // Get all attendances for these sessions
        const sessionIds = sessions.map(s => s.id);
        const attendances = await this.prisma.attendance.findMany({
            where: {
                sessionId: { in: sessionIds },
            },
            select: {
                studentId: true,
                sessionId: true,
                checkInTime: true,
                status: true,
                session: {
                    select: {
                        date: true,
                    },
                },
            },
        });

        // Build attendance map: studentId -> date -> has attendance
        const attendanceMap = new Map<string, Map<string, boolean>>();
        attendances.forEach(att => {
            if (!attendanceMap.has(att.studentId)) {
                attendanceMap.set(att.studentId, new Map());
            }
            const studentAttendances = attendanceMap.get(att.studentId)!;

            // Student is present if they checked in for ANY session on that date
            if (att.checkInTime) {
                studentAttendances.set(att.session.date, true);
            } else if (!studentAttendances.has(att.session.date)) {
                // Only mark as absent if they haven't checked in any session that day
                studentAttendances.set(att.session.date, false);
            }
        });

        // Build matrix
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        const matrix = enrolledStudents.map(enrollment => {
            const studentId = enrollment.student.id;
            const studentAttendances = attendanceMap.get(studentId) || new Map();

            // Get enrollment date (when student was approved to join class)
            const enrollmentDate = enrollment.approvedAt
                ? new Date(enrollment.approvedAt).toISOString().split('T')[0]
                : enrollment.createdAt
                    ? new Date(enrollment.createdAt).toISOString().split('T')[0]
                    : dates[0]; // Fallback to first date in range

            const dailyStatus = dates.map(date => {
                const hasAttendance = studentAttendances.get(date);

                // Check if date is within student's enrollment period
                const isBeforeEnrollment = date < enrollmentDate;
                const isAfterToday = date > today;

                // Logic:
                // - If date is before enrollment or after today -> NO_SESSION (-)
                // - If student checked in -> PRESENT (✓)
                // - If student registered but didn't check in (between enrollment and today) -> ABSENT (✗)
                // - If no attendance record exists and date is between enrollment and today -> ABSENT (✗)

                if (isBeforeEnrollment || isAfterToday) {
                    return {
                        date,
                        status: 'NO_SESSION',
                    };
                }

                // Between enrollment date and today
                if (hasAttendance === true) {
                    return {
                        date,
                        status: 'PRESENT',
                    };
                } else {
                    // Default to ABSENT for all dates between enrollment and today
                    return {
                        date,
                        status: 'ABSENT',
                    };
                }
            });

            const presentCount = dailyStatus.filter(d => d.status === 'PRESENT').length;
            const absentCount = dailyStatus.filter(d => d.status === 'ABSENT').length;
            const totalDays = dates.length;
            const attendanceRate = totalDays > 0 ? (presentCount / totalDays) * 100 : 0;

            return {
                student: enrollment.student,
                dailyStatus,
                presentCount,
                absentCount,
                totalDays,
                attendanceRate,
            };
        });

        return {
            startDate,
            endDate,
            dates,
            students: matrix,
            totalStudents: enrolledStudents.length,
            totalDays: dates.length,
        };
    }
}
