import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

export class RegisterDto {
    @IsString()
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    fullName: string;

    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    password: string;

    @IsOptional()
    @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
    dateOfBirth?: string;
}
