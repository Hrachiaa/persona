import { IsString, IsNumber, IsEmail, Length, IsIn, IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
    @ApiProperty({ example: 'example@gmail.com', description: 'Email of the user' })
    @IsString({ message: 'Email must be a string' }) 
    @IsEmail({}, { message: 'Email must be a valid email' })
    readonly email: string;

    @ApiProperty({ example: 'password', description: 'Password of the user' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 32, { message: 'Password must be between 8 and 32 characters long' })
    readonly password: string;

    @ApiProperty({ example: 'John Doe', description: 'Name of the user' })
    @IsString({ message: 'Name must be a string' })
    readonly name: string;

    @ApiProperty({ example: 'M', description: 'Gender of the user' })
    @IsString({ message: 'Gender must be a string' })
    @IsIn(['M', 'F'])
    readonly gender: string;

    @ApiProperty({ example: 2000, description: 'Birth date of the user' })
    @IsInt({ message: 'Birth date must be an integer' })
    @Min(1900, { message: 'Birth date must be greater than 1900' })
    @Max(2026, { message: 'Birth date must be less than 2026' })
    readonly birthDate: number
}

