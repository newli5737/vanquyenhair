import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phone: string;

    @IsString()
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    password: string;
}
