import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { AuthModule } from './auth/auth.module';
import { FaceServiceModule } from './face-service/face-service.module';
import { StudentModule } from './student/student.module';
import { SessionModule } from './session/session.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TrainingClassModule } from './training-class/training-class.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CloudinaryModule,
    AuthModule,
    FaceServiceModule,
    StudentModule,
    SessionModule,
    AttendanceModule,
    TrainingClassModule,
    EnrollmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
