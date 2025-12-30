import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateEnrollmentRequestDto {
    @IsString()
    @IsNotEmpty({ message: 'ID lớp học không được để trống' })
    trainingClassId: string;
}

export class ReviewEnrollmentDto {
    @IsEnum(['APPROVED', 'REJECTED'], { message: 'Trạng thái không hợp lệ' })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    status: 'APPROVED' | 'REJECTED';

    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
