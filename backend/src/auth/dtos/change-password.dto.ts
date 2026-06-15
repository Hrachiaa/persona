import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class ChangePasswordDto {
    @ApiProperty({ example: 'currentPassword', description: 'Current password' })
    @IsString({ message: 'Invalid password' })
    currentPassword: string;

    @ApiProperty({ example: 'newPassword', description: 'New password' })
    @IsString({ message: 'Invalid password' })
    @Length(8, 32, { message: 'Password must be between 8 and 32 characters long' })
    newPassword: string;
}
