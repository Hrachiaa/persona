import { IsString } from 'class-validator';

export class SendRequestDto {
  @IsString()
  targetId: string;
}
