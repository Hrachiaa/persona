import { NotFoundException } from "@nestjs/common";
import { TestResultDto } from "../dtos/test-result.dto";
import { TestResultEntity } from "../models/test-result.entity";

class TestResultMapper {
    toDto(testResult: TestResultEntity): TestResultDto {
        if (testResult.testType === 'iq' || testResult.testType === 'bigFive' || testResult.testType === 'shcwartz' || testResult.testType === 'mbti') {
            return new TestResultDto(testResult.testId, testResult.testType, testResult.result)
        }
        throw new NotFoundException('Unknown test type')
    }

    toArrayDto(testResult: TestResultEntity[]): TestResultDto[] {
        return testResult.map((testResult) => {
            return this.toDto(testResult)
        })
    }
}

export default new TestResultMapper()