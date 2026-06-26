import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: "The user's message to the AI" })
  @IsString()
  @Length(1, 4000)
  content: string;
}
