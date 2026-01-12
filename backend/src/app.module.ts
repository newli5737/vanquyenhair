import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
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
import { MailerModule } from './common/mailer/mailer.module';
import { StatisticsModule } from './statistics/statistics.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

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
    MailerModule,
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: any) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
