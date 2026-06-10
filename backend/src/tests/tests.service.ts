import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { TestRepository } from './test.repository';
import { TestResultRepository } from './test-result.repository';
import { SubmitTestDto } from './dtos/submit-test.dto';
import { TestResultDto } from './dtos/test-result.dto';
import { TestResultEntity } from './models/test-result.entity';
import { TestEntity } from './models/test.entity';
import { GetTestsDto } from './dtos/get-tests.dto';
import { TestQuestionsEntity } from './models/test-questions.entity';
import testResultMapper from './mappers/test-result.mapper';
import testMapper from './mappers/test.mapper';
import { QuestionsDto } from './dtos/test-questions.dto';
import { TestScoringService } from './test-scoring.service';
import { TEST_ORDER } from './test-order';
import { PortraitService } from '../portrait/portrait.service';

@Injectable()
export class TestsService implements OnModuleInit {
    constructor(
        private readonly testRepository: TestRepository,
        private readonly testResultRepository: TestResultRepository,
        private readonly testScoringService: TestScoringService,
        @Inject(forwardRef(() => PortraitService))
        private readonly portraitService: PortraitService,
    ) {}

    async onModuleInit() {
        const isExists = await this.testRepository.getAllTests()
        if(isExists.length === 6) return
        
        const tests = await this.testRepository.createTests()
        await this.testRepository.createQuestions(tests.iq.id, tests.bigFive.id, tests.schwartz.id, tests.ecr.id, tests.cope.id, tests.pid.id)
        return
    }

    async getAllTests(userId: string): Promise<GetTestsDto[]> {
        const testsDB: TestEntity[] = await this.testRepository.getAllTests()
        const resultsDB: TestResultEntity[] = await this.testResultRepository.getTestResults(userId) as unknown as TestResultEntity[]
        const tests = testMapper.toDto(testsDB)
        const results = testResultMapper.toArrayDto(resultsDB)
        return tests.map((test) => {
            const result = results.find((result) => result.testId === test.id)
            return new GetTestsDto({...test}, result)
        })
    }

    async getTestQuesitions(testId: string): Promise<QuestionsDto[]> {
        const questions = await this.testRepository.getTestQuestions(testId) as TestQuestionsEntity | null
        if(!questions) throw new NotFoundException('Questions not found')
        return questions.questions.questions
    }

    async submitTest(userId: string, testId: string, answers: SubmitTestDto): Promise<TestResultDto> {
        const test = await this.testRepository.getTestById(testId)
        if(!test) throw new InternalServerErrorException('Test not found')

        await this.ensurePreviousTestsCompleted(userId, test.testType)

        const result = await this.testScoringService.calculate(test.testType, userId, testId, answers.answers)

        const isExists = await this.testResultRepository.getTestResult(userId, testId)
        const save = isExists
            ? await this.testResultRepository.updateTestResult(userId, testId, result) as unknown as TestResultEntity
            : await this.testResultRepository.createTestResult({userId, testId, result, testType: test.testType}) as unknown as TestResultEntity

        // Rebuild the cross-test portrait from the latest answers. Fire-and-forget so
        // the submit response isn't held for the (up to a minute) LLM call; the portrait
        // tab polls for the result. `regenerate` never throws. Always runs — including
        // retakes, where the set of completed tests is unchanged but the answers aren't.
        void this.portraitService.regenerate(userId)

        return testResultMapper.toDto(save)
    }

    private async ensurePreviousTestsCompleted(userId: string, testType: string): Promise<void> {
        const order = TEST_ORDER.indexOf(testType as typeof TEST_ORDER[number])
        if(order <= 0) return

        const previousTests = TEST_ORDER.slice(0, order)
        const results = await this.testResultRepository.getTestResults(userId)
        const completed = new Set(results.map((result) => result.testType))
        const missing = previousTests.filter((type) => !completed.has(type))

        if(missing.length) throw new BadRequestException(`Complete previous tests first: ${missing.join(', ')}`)
    }
}
