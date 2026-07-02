import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { TestRepository } from './test.repository';
import { TestResultRepository } from './test-result.repository';
import { TestProgressRepository } from './test-progress.repository';
import { SubmitTestDto, AnswerDto } from './dtos/submit-test.dto';
import { SubmitFragmentDto } from './dtos/submit-fragment.dto';
import { FragmentResultDto } from './dtos/fragment-result.dto';
import { PART_SIZE, partsTotal } from './test-parts';
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
import { UsersService } from '../users/users.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TestsService implements OnModuleInit {
    constructor(
        private readonly testRepository: TestRepository,
        private readonly testResultRepository: TestResultRepository,
        private readonly testProgressRepository: TestProgressRepository,
        private readonly testScoringService: TestScoringService,
        @Inject(forwardRef(() => PortraitService))
        private readonly portraitService: PortraitService,
        @Inject(forwardRef(() => CompatibilityService))
        private readonly compatibilityService: CompatibilityService,
        private readonly usersService: UsersService,
    ) {}

    async onModuleInit() {
        // Idempotent seed: upsert the 6 tests by testType, then sync their question
        // banks. Works from any state (fresh DB, partial, or fully seeded) and lets
        // seed edits (e.g. the bilingual BigFive text) propagate on restart.
        const seeded = await this.testRepository.upsertTests()
        await this.testRepository.syncQuestions(seeded)
    }

    async getAllTests(userId: string): Promise<GetTestsDto[]> {
        const testsDB: TestEntity[] = await this.testRepository.getAllTests()
        const resultsDB: TestResultEntity[] = await this.testResultRepository.getTestResults(userId) as unknown as TestResultEntity[]
        const progressDB = await this.testProgressRepository.getAll(userId)
        const tests = testMapper.toDto(testsDB)
        const results = testResultMapper.toArrayDto(resultsDB)
        return tests.map((test) => {
            const result = results.find((result) => result.testId === test.id)
            // For a chunked test, report how many fragments are done (0 when not yet
            // started) and the total — drives the Portrait's segmented progress ring.
            const total = partsTotal(test.testType, test.totalQuestions)
            const progress = total
                ? { partsCompleted: progressDB.find((p) => p.testId === test.id)?.parts ?? 0, partsTotal: total }
                : null
            return new GetTestsDto({...test}, result, progress)
        })
    }

    async getTestQuesitions(testId: string, userId: string): Promise<QuestionsDto[]> {
        const questions = await this.testRepository.getTestQuestions(testId) as TestQuestionsEntity | null
        if(!questions) throw new NotFoundException(t('errors.test.questionsNotFound'))

        // Some tests have gender-specific wording (Schwartz PVQ-RR: him/her). The bank
        // then carries a separate `F` set; serve it to female users. Other tests have no
        // `F`, so this is a no-op for them. Item ids are identical across sets, so
        // scoring is unaffected by which wording was shown.
        const bank = questions.questions as any
        let list = bank.questions
        if (bank.F) {
            const user = await this.usersService.getUserById(userId)
            if (user?.gender === 'F') list = bank.F
        }

        return localizeQuestions(list, getLang())
    }

    async submitTest(userId: string, testId: string, answers: SubmitTestDto): Promise<TestResultDto> {
        const test = await this.testRepository.getTestById(testId)
        if(!test) throw new NotFoundException(t('errors.test.testNotFound'))

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

    // Submit one fragment ("approach") of a chunked test. Answers are appended to
    // the earlier fragments' answers (kept in TestProgress); only on the final
    // fragment is the whole test scored into a TestResult, after which the progress
    // row is cleared. `part` must be the next expected fragment — a re-sent earlier
    // part is a no-op (idempotent), a gap is rejected.
    async submitFragment(userId: string, testId: string, dto: SubmitFragmentDto): Promise<FragmentResultDto> {
        const test = await this.testRepository.getTestById(testId)
        if(!test) throw new NotFoundException(t('errors.test.testNotFound'))

        const total = partsTotal(test.testType, test.totalQuestions)
        const size = PART_SIZE[test.testType]
        if(!total || !size) throw new BadRequestException(t('errors.test.notChunked'))

        await this.ensurePreviousTestsCompleted(userId, test.testType)

        const progress = await this.testProgressRepository.get(userId, testId)
        const done = progress?.parts ?? 0

        // Idempotency / ordering: a re-sent earlier fragment just echoes the current
        // state; a gap (part ahead of what's stored) is an error.
        if(dto.part < done) return new FragmentResultDto(testId, done, total, false)
        if(dto.part !== done) throw new BadRequestException(t('errors.test.fragmentOrder', { expected: done }))

        // This fragment carries `size` answers, except a final short fragment.
        const start = dto.part * size
        const expected = Math.min(size, test.totalQuestions - start)
        if(dto.answers.length !== expected) throw new BadRequestException(t('errors.test.answersCount', { count: expected }))

        const previous = (progress?.answers as unknown as AnswerDto[]) ?? []
        const answers = [...previous, ...dto.answers]
        const newParts = dto.part + 1

        // Not the last fragment yet — persist progress and report how far we are.
        if(newParts < total) {
            await this.testProgressRepository.upsert({ userId, testId, testType: test.testType, answers, parts: newParts })
            return new FragmentResultDto(testId, newParts, total, false)
        }

        // Final fragment — score the full set, write the result (mirrors submitTest),
        // clear progress, and rebuild the dependent portrait / compatibilities.
        const result = await this.testScoringService.calculate(test.testType, userId, testId, answers)
        const isExists = await this.testResultRepository.getTestResult(userId, testId)
        const save = isExists
            ? await this.testResultRepository.updateTestResult(userId, testId, result) as unknown as TestResultEntity
            : await this.testResultRepository.createTestResult({userId, testId, result, testType: test.testType, shareToken: randomBytes(9).toString('base64url')}) as unknown as TestResultEntity
        await this.testProgressRepository.delete(userId, testId)

        void this.portraitService.regenerate(userId)
        void this.compatibilityService.invalidateForUser(userId)

        return new FragmentResultDto(testId, total, total, true, testResultMapper.toDto(save))
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
