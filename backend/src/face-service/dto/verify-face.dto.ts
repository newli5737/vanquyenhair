import { IsString, IsUrl } from 'class-validator';

export class VerifyFaceDto {
    @IsString()
    @IsUrl()
    selfieUrl: string;
}
