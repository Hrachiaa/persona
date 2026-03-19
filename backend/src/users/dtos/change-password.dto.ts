import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
    @ApiProperty({
        example: 'oldPassword',
        description: 'Old password',
    })
    @IsString({message: 'Old password must be a string'})
    @Length(8, 32, {message: 'Old password must be between 8 and 32 characters'})
    readonly oldPassword: string;

    @ApiProperty({
        example: 'newPassword',
        description: 'New password',
    })
    @IsString({message: 'New password must be a string'})
    @Length(8, 32, {message: 'New password must be between 8 and 32 characters'})
    readonly newPassword: string;
}