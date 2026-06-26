import { InternalServerErrorException } from "@nestjs/common";
import { TestsDto } from "../dtos/get-tests.dto";
import { TestEntity } from "../models/test.entity";
import { t } from "../../i18n/translate";

class TestMapper {
    toDto(testEntity: TestEntity[]): TestsDto[]{
        return testEntity.map((test) => {
            return this.toSingleDto(test)
        })
    }

    private toSingleDto(testEntity: TestEntity): TestsDto{
        if(testEntity.testType === 'iq' || testEntity.testType === 'bigFive' || testEntity.testType === 'shcwartz' || testEntity.testType === 'ecr' || testEntity.testType === 'cope' || testEntity.testType === 'pid'){
            return new TestsDto(
                testEntity.id,
                testEntity.testType,
                testEntity.description,
                testEntity.testName,
                testEntity.duration,
                testEntity.totalQuestions,
            )
        }
        throw new InternalServerErrorException(t('errors.test.testTypeNotFound'))
    }
}

export default new TestMapper();