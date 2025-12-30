import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateStudentDto {
    @IsString()
    @IsNotEmpty({ message: 'Mã học viên không được để trống' })
    studentCode: string;

    @IsString()
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    fullName: string;

    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phone: string;

    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    password: string;

    @IsOptional()
    @IsString()
    avatarBase64?: string;
}

export class UpdateStudentDto {
    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    avatarBase64?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    identityCard?: string;

    @IsOptional()
    @IsString()
    identityCardImage?: string;

    @IsOptional()
    // @IsDateString() // Optional validation
    dateOfBirth?: string; // Receive as string, parse later or use Date if transformed


}
