import { TestResultDto } from "./test-result.dto";

export class TestsDto {
    constructor(
        public readonly id: string,
        public readonly testType: 'iq' | 'bigFive' | 'archetype' | 'mbti',
        public readonly description: string,
        public readonly testName: string,
        public readonly duration: number | null,
        public readonly totalQuestions: number,
    ) {}
}

export class GetTestsDto extends TestsDto {
    result: TestResultDto | undefined;
    constructor(
        {id, testType, description, testName, duration, totalQuestions}: TestsDto,
        result: TestResultDto | undefined,
    ) {
        super(id, testType, description, testName, duration, totalQuestions)
        this.result = result
    }
}