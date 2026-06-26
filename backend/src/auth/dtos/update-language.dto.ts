import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsIn } from "class-validator";

export class UpdateLanguageDto {
    @ApiProperty({example: 'ru', description: 'User UI language'})
    @IsString()
    @IsIn(['en', 'ru'])
    language: string;
}
