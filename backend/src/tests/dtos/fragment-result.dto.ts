import { TestResultDto } from './test-result.dto';

// Response to a fragment submit. `partsCompleted` of `partsTotal` are now done;
// when `completed` is true the final fragment was scored and `result` holds the
// freshly written TestResult (otherwise null).
export class FragmentResultDto {
  constructor(
    public readonly testId: string,
    public readonly partsCompleted: number,
    public readonly partsTotal: number,
    public readonly completed: boolean,
    public readonly result: TestResultDto | null = null,
  ) {}
}
