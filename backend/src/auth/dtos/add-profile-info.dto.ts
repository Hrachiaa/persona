import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsInt, Min, Max, IsIn, IsOptional } from "class-validator";

export class AddProfileInfoDto {
    @ApiProperty({example: 'Rachia', description: 'User Name'})
    @IsString()
    @IsNotEmpty()
    name: string;
    @ApiProperty({example: 'M', description: 'User Gender'})
    @IsString()
    @IsIn(['M', 'F'])
    gender: string;
    @ApiProperty({example: 2001, description: 'User Birth Date'})
    @IsInt()
    @Min(1900)
    @Max(2026)
    birthDate: number;
    @ApiProperty({example: 'en', description: 'User UI language', required: false})
    @IsOptional()
    @IsString()
    @IsIn(['en', 'ru'])
    language?: string;
}