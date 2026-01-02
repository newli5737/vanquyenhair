import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
    constructor(private studentService: StudentService) { }

    // Admin Endpoints
    @Post('admin/students')
    @Roles(Role.ADMIN)
    async createStudent(@Body() createStudentDto: CreateStudentDto) {
        return this.studentService.createStudent(createStudentDto);
    }

    @Put('admin/students/:id')
    @Roles(Role.ADMIN)
    async updateStudent(
        @Param('id') id: string,
        @Body() updateStudentDto: UpdateStudentDto,
    ) {
        return this.studentService.updateStudent(id, updateStudentDto);
    }

    @Get('admin/students')
    @Roles(Role.ADMIN)
    async getAllStudents() {
        return this.studentService.getAllStudents();
    }

    @Get('admin/students/:id')
    @Roles(Role.ADMIN)
    async getStudentById(@Param('id') id: string) {
        return this.studentService.getStudentById(id);
    }

    @Delete('admin/students/:id')
    @Roles(Role.ADMIN)
    async deleteStudent(@Param('id') id: string) {
        return this.studentService.deleteStudent(id);
    }

    // Student Endpoints
    @Get('student/profile')
    @Roles(Role.STUDENT)
    async getMyProfile(@Req() req) {
        return this.studentService.getStudentByUserId(req.user.userId);
    }

    @Put('student/profile')
    @Roles(Role.STUDENT)
    async updateMyProfile(@Req() req, @Body() updateStudentDto: UpdateStudentDto) {
        const student = await this.studentService.getStudentByUserId(req.user.userId);
        return this.studentService.updateStudent(student.id, updateStudentDto);
    }
}
