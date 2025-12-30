import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateSessionDto {
    @IsString()
    @IsNotEmpty({ message: 'Ngày không được để trống' })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải có định dạng YYYY-MM-DD' })
    date: string;

    @IsString()
    @IsNotEmpty({ message: 'Tên ca học không được để trống' })
    name: string;

    @IsString()
    @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
    @Matches(/^\d{2}:\d{2}$/, { message: 'Giờ bắt đầu phải có định dạng HH:mm' })
    startTime: string;

    @IsString()
    @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
    @Matches(/^\d{2}:\d{2}$/, { message: 'Giờ kết thúc phải có định dạng HH:mm' })
    endTime: string;

    @IsString()
    @IsNotEmpty({ message: 'Lớp học không được để trống' })
    trainingClassId: string;
}
