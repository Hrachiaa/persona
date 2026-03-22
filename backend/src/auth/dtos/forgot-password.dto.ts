import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length } from "class-validator";

export class ForgotPasswordDto {
    @ApiProperty({example: 'example@gmail.com', description: 'Email'})
    @IsEmail({}, {message: 'Invalid email'})
    email: string;
}

export class ForgotPasswordCodeDto extends ForgotPasswordDto {
    @ApiProperty({example: '123456', description: 'Code'})
    @IsString({message: 'Invalid code'})
    @Length(6, 6, {message: 'Invalid code'})
    code: string;
}

export class ChangeForgottenPasswordDto extends ForgotPasswordCodeDto {
    @ApiProperty({example: 'password', description: 'Password'})
    @IsString({message: 'Invalid password'})
    @Length(8, 32, {message: 'Password must be between 8 and 32 characters long'})
    newPassword: string;
}