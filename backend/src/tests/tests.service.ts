import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
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
import { AiService } from '../ai/ai.service';

// Tests must be completed in this order — a test is locked until every test before it is done.
const TEST_ORDER = ['bigFive', 'shcwartz', 'cope', 'iq', 'ecr', 'pid'] as const;

@Injectable()
export class TestsService implements OnModuleInit {
    private readonly logger = new Logger(TestsService.name);
    // dedupes concurrent interpretation generations for the same result (StrictMode
    // double-fetch, multiple tabs, races) so the LLM is called only once
    private readonly interpretationInFlight = new Map<string, Promise<string | null>>();

    constructor(
        private readonly testRepository: TestRepository,
        private readonly testResultRepository: TestResultRepository,
        private readonly testScoringService: TestScoringService,
        private readonly aiService: AiService,
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

    async getResult(userId: string, testId: string): Promise<TestResultDto> {
        const result = await this.testResultRepository.getTestResult(userId, testId) as unknown as TestResultEntity | null
        if(!result) throw new NotFoundException('Test result not found')

        // generate + cache the interpretation lazily on first view; concurrent
        // requests for the same result share a single generation (see dedupe below)
        if(result.interpretation == null) {
            const interpretation = await this.dedupedInterpretation(userId, testId, result.testType, result.result)
            if(interpretation) {
                return testResultMapper.toDto({ ...result, interpretation })
            }
        }
        return testResultMapper.toDto(result)
    }

    /**
     * Wraps generateAndCacheInterpretation with an in-flight map so that
     * simultaneous callers for the same (userId, testId) await one generation
     * instead of each firing their own LLM request.
     */
    private dedupedInterpretation(userId: string, testId: string, testType: string, result: TestResultEntity['result']): Promise<string | null> {
        const key = `${userId}:${testId}`
        let inFlight = this.interpretationInFlight.get(key)
        if(!inFlight) {
            inFlight = this.generateAndCacheInterpretation(userId, testId, testType, result)
                .finally(() => this.interpretationInFlight.delete(key))
            this.interpretationInFlight.set(key, inFlight)
        }
        return inFlight
    }

    /**
     * Generates the AI interpretation and caches it on the result row.
     * Best-effort: never throws — on failure it logs and returns null so the
     * caller can fall back to the raw result (and retry on the next fetch).
     */
    private async generateAndCacheInterpretation(userId: string, testId: string, testType: string, result: TestResultEntity['result']): Promise<string | null> {
        try {
            const interpretation = await this.aiService.interpret(testType, result)
            if(interpretation) {
                await this.testResultRepository.updateInterpretation(userId, testId, interpretation)
            }
            return interpretation
        } catch (error) {
            this.logger.error(`Failed to generate interpretation for testId=${testId}`, error as Error)
            return null
        }
    }

    async submitTest(userId: string, testId: string, answers: SubmitTestDto): Promise<TestResultDto> {
        const test = await this.testRepository.getTestById(testId)
        if(!test) throw new InternalServerErrorException('Test not found')

        await this.ensurePreviousTestsCompleted(userId, test.testType)

        const result = await this.testScoringService.calculate(test.testType, userId, testId, answers.answers)

        const isExists = await this.testResultRepository.getTestResult(userId, testId)
        if(isExists) {
            const save = await this.testResultRepository.updateTestResult(userId, testId, result) as unknown as TestResultEntity
            return testResultMapper.toDto(save)
        }
        const save = await this.testResultRepository.createTestResult({userId, testId, result, testType: test.testType}) as unknown as TestResultEntity
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
