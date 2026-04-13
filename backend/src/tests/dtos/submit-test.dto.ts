import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export interface IqTestAnswer {
    questionId: string;
    optionId: string;
}

export class SubmitTestDto {
    @ApiProperty({example: '123456', description: 'Code'})
    @IsString({message: 'Invalid code'})
    readonly answers: IqTestAnswer[]
}

