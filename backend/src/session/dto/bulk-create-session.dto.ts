import { IsString, IsDateString, IsBoolean, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class SessionTemplateDto {
    @IsString()
    name: string;

    @IsString()
    startTime: string; // Format: HH:mm

    @IsString()
    endTime: string; // Format: HH:mm
}

export class BulkCreateSessionDto {
    @IsString()
    trainingClassId: string;

    @IsDateString()
    startDate: string; // Format: YYYY-MM-DD

    @IsDateString()
    endDate: string; // Format: YYYY-MM-DD

    @IsBoolean()
    @IsOptional()
    excludeSaturday?: boolean; // Bỏ T7

    @IsBoolean()
    @IsOptional()
    excludeWeekends?: boolean; // Bỏ T7 và CN

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SessionTemplateDto)
    sessions: SessionTemplateDto[]; // Mảng chứa thông tin 3 ca
}
