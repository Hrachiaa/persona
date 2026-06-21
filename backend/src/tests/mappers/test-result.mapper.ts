import { NotFoundException } from "@nestjs/common";
import { TestResultDto } from "../dtos/test-result.dto";
import { TestResultEntity } from "../models/test-result.entity";
import { t } from "../../i18n/translate";

class TestResultMapper {
    toDto(testResult: TestResultEntity): TestResultDto {
        if (testResult.testType === 'iq' || testResult.testType === 'bigFive' || testResult.testType === 'shcwartz' || testResult.testType === 'ecr' || testResult.testType === 'cope' || testResult.testType === 'pid') {
            return new TestResultDto(testResult.testId, testResult.testType, testResult.result, testResult.shareToken ?? null)
        }
        throw new NotFoundException(t('errors.test.unknownTestType'))
    }

    toArrayDto(testResult: TestResultEntity[]): TestResultDto[] {
        return testResult.map((testResult) => {
            return this.toDto(testResult)
        })
    }
}

export default new TestResultMapper()