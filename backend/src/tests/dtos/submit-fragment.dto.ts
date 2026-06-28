import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerDto } from './submit-test.dto';

// One fragment ("approach") of a chunked test. `part` is the 0-based fragment
// index being submitted; `answers` are that fragment's answers only (the server
// appends them to the answers from earlier fragments).
export class SubmitFragmentDto {
  @IsInt()
  @Min(0)
  readonly part: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  readonly answers: AnswerDto[];
}
