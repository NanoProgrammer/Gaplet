import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateAuthDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsString()
    @MinLength(2)
    name?: string;
}
