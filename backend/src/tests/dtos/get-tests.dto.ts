import { TestResultDto } from "./test-result.dto";

export class TestsDto {
    constructor(
        public readonly id: string,
        public readonly testType: 'iq' | 'bigFive' | 'shcwartz' | 'ecr' | 'cope' | 'pid',
        public readonly description: string,
        public readonly testName: string,
        public readonly duration: number | null,
        public readonly totalQuestions: number,
    ) {}
}

export class GetTestsDto extends TestsDto {
    result: TestResultDto | undefined;
    // For a test taken in fragments: how many parts are done and the total. Both
    // null for a single-submit test. `partsCompleted` is 0 (not null) for a chunked
    // test the user hasn't started, so the frontend can draw an empty progress ring.
    partsCompleted: number | null;
    partsTotal: number | null;
    constructor(
        {id, testType, description, testName, duration, totalQuestions}: TestsDto,
        result: TestResultDto | undefined,
        progress?: { partsCompleted: number; partsTotal: number } | null,
    ) {
        super(id, testType, description, testName, duration, totalQuestions)
        this.result = result
        this.partsCompleted = progress?.partsCompleted ?? null
        this.partsTotal = progress?.partsTotal ?? null
    }
}