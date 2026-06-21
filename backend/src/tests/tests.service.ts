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
import { t, getLang } from '../i18n/translate';
import { localizeQuestions } from './localize-questions';
import { CompatibilityService } from '../friends/compatibility.service';
import { SharedResultDto } from './dtos/shared-result.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TestsService implements OnModuleInit {
    constructor(
        private readonly testRepository: TestRepository,
        private readonly testResultRepository: TestResultRepository,
        private readonly testScoringService: TestScoringService,
        @Inject(forwardRef(() => PortraitService))
        private readonly portraitService: PortraitService,
        @Inject(forwardRef(() => CompatibilityService))
        private readonly compatibilityService: CompatibilityService,
    ) {}

    async onModuleInit() {
        const existing = await this.testRepository.getAllTests()
        if(existing.length !== 6) {
            const tests = await this.testRepository.createTests()
            await this.testRepository.createQuestions(tests.iq.id, tests.bigFive.id, tests.schwartz.id, tests.ecr.id, tests.cope.id, tests.pid.id)
            return
        }

        // Keep stored question banks in sync with the seed so edits (e.g. the
        // bilingual BigFive text) propagate on restart without a manual reseed.
        await this.testRepository.syncQuestions(existing)
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
        if(!questions) throw new NotFoundException(t('errors.test.questionsNotFound'))
        return localizeQuestions(questions.questions.questions, getLang())
    }

    async submitTest(userId: string, testId: string, answers: SubmitTestDto): Promise<TestResultDto> {
        const test = await this.testRepository.getTestById(testId)
        if(!test) throw new InternalServerErrorException(t('errors.test.testNotFound'))

        await this.ensurePreviousTestsCompleted(userId, test.testType)

        const result = await this.testScoringService.calculate(test.testType, userId, testId, answers.answers)

        const isExists = await this.testResultRepository.getTestResult(userId, testId)
        const save = isExists
            // Retake — keep the existing share link so any already-sent URL still works.
            ? await this.testResultRepository.updateTestResult(userId, testId, result) as unknown as TestResultEntity
            // First time — mint the share token up front so the link exists immediately.
            : await this.testResultRepository.createTestResult({userId, testId, result, testType: test.testType, shareToken: randomBytes(9).toString('base64url')}) as unknown as TestResultEntity

        // Rebuild the cross-test portrait from the latest answers. Fire-and-forget so
        // the submit response isn't held for the (up to a minute) LLM call; the portrait
        // tab polls for the result. `regenerate` never throws. Always runs — including
        // retakes, where the set of completed tests is unchanged but the answers aren't.
        void this.portraitService.regenerate(userId)

        // Drop cached pair compatibilities — the next view regenerates from fresh
        // results. Fire-and-forget; `invalidateForUser` never throws.
        void this.compatibilityService.invalidateForUser(userId)

        return testResultMapper.toDto(save)
    }

    // Mint (or reuse) a public share token for the user's result on this test.
    // Idempotent: a second call returns the same token, so re-sharing keeps the
    // link the user may have already sent.
    async createShareLink(userId: string, testId: string): Promise<{ token: string }> {
        const result = await this.testResultRepository.getTestResult(userId, testId)
        if(!result) throw new NotFoundException(t('errors.test.resultNotFound'))
        if(result.shareToken) return { token: result.shareToken }

        const token = randomBytes(9).toString('base64url')
        const saved = await this.testResultRepository.setShareToken(userId, testId, token)
        return { token: saved.shareToken! }
    }

    async getSharedResult(token: string): Promise<SharedResultDto> {
        const result = await this.testResultRepository.getByShareToken(token)
        if(!result) throw new NotFoundException(t('errors.test.sharedResultNotFound'))

        const testType = result.testType
        if(testType !== 'iq' && testType !== 'bigFive' && testType !== 'shcwartz' && testType !== 'ecr' && testType !== 'cope' && testType !== 'pid') {
            throw new NotFoundException(t('errors.test.unknownTestType'))
        }
        return new SharedResultDto(testType, result.test.testName, result.user.name ?? null, result.result as any)
    }

    private async ensurePreviousTestsCompleted(userId: string, testType: string): Promise<void> {
        const order = TEST_ORDER.indexOf(testType as typeof TEST_ORDER[number])
        if(order <= 0) return

        const previousTests = TEST_ORDER.slice(0, order)
        const results = await this.testResultRepository.getTestResults(userId)
        const completed = new Set(results.map((result) => result.testType))
        const missing = previousTests.filter((type) => !completed.has(type))

        if(missing.length) throw new BadRequestException(t('errors.test.completePrevious', { tests: missing.join(', ') }))
    }
}
