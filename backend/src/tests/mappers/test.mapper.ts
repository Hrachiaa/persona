import { InternalServerErrorException } from "@nestjs/common";
import { TestsDto } from "../dtos/get-tests.dto";
import { TestEntity } from "../models/test.entity";

class TestMapper {
    toDto(testEntity: TestEntity[]): TestsDto[]{
        return testEntity.map((test) => {
            return this.toSingleDto(test)
        })
    }

    private toSingleDto(testEntity: TestEntity): TestsDto{
        if(testEntity.testType === 'iq' || testEntity.testType === 'szondi' || testEntity.testType === 'archetype' || testEntity.testType === 'mbti'){
            return new TestsDto(
                testEntity.id,
                testEntity.testType,
                testEntity.description,
                testEntity.testName,
                testEntity.duration,
                testEntity.totalQuestions,
            )
        }
        throw new InternalServerErrorException('Test type not found')
    }
}

export default new TestMapper();