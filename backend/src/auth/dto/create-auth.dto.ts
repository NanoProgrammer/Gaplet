import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateAuthDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}
