import { IsDateString, IsOptional, IsString } from 'class-validator';

export class WeeklyReportQueryDto {
    @IsDateString()
    startDate: string; // Format: YYYY-MM-DD

    @IsDateString()
    endDate: string; // Format: YYYY-MM-DD

    @IsString()
    @IsOptional()
    classId?: string; // Optional filter theo lớp
}
