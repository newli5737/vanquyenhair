import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CheckInDto {
    @IsString()
    @IsNotEmpty({ message: 'Session ID không được để trống' })
    sessionId: string;

    @IsString()
    @IsNotEmpty({ message: 'Ảnh khuôn mặt không được để trống' })
    imageBase64: string;

    @IsNumber()
    @IsOptional()
    lat?: number;

    @IsNumber()
    @IsOptional()
    lng?: number;
}

export class CheckOutDto {
    @IsString()
    @IsNotEmpty({ message: 'Session ID không được để trống' })
    sessionId: string;

    @IsString()
    @IsNotEmpty({ message: 'Ảnh khuôn mặt không được để trống' })
    imageBase64: string;

    @IsNumber()
    @IsOptional()
    lat?: number;

    @IsNumber()
    @IsOptional()
    lng?: number;
}
