import { Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { TestRepository } from './test.repository';
import { TestResultRepository } from './test-result.repository';
import { SubmitTestDto, AnswerDto } from './dtos/submit-test.dto';
import { TestResultDto } from './dtos/test-result.dto';
import { IqTestResult, MbtiTestResult, SzondiTestResult, ArchetypeTestResult, TestResultEntity } from './entities/test-result.entity';
import { TestEntity } from './entities/test.entity';
import { GetTestsDto } from './dtos/get-tests.dto';
import { Result, Results, Scoring } from './entities/iqtest-questions.entity';
import { TestQuestionsEntity } from './entities/test-questions.entity';
import testResultMapper from './mappers/test-result.mapper';
import testMapper from './mappers/test.mapper';
import { QuestionsDto } from './dtos/test-questions.dto';

@Injectable()
export class TestsService implements OnModuleInit {
    constructor(
        private readonly testRepository: TestRepository,
        private readonly testResultRepository: TestResultRepository,
    ) {}

    async onModuleInit() {
        const isExists = await this.testRepository.getAllTests()
        if(isExists.length === 4) return
        
        const tests = await this.testRepository.createTests()
        await this.testRepository.createQuestions(tests.iq.id, tests.szondi.id, tests.archetype.id, tests.mbti.id)
        return
    }

    async getAllTests(userId: string): Promise<GetTestsDto[]> {
        const testsDB: TestEntity[] = await this.testRepository.getAllTests()
        const resultsDB: TestResultEntity[] = await this.testResultRepository.getTestResults(userId) as TestResultEntity[]
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
        const calculators = {
            iq: this.calculateIQ,
            szondi: this.calculateSzondi,
            archetype: this.calculateArchetype,
            mbti: this.calculateMBTI
        }

        const result: IqTestResult | SzondiTestResult | ArchetypeTestResult | MbtiTestResult = await calculators[test.testType](userId, testId, answers.answers)

        const isExists = await this.testResultRepository.getTestResult(userId, testId)
        if(isExists) {
            const save = await this.testResultRepository.updateTestResult(userId, testId, result) as TestResultEntity
            return testResultMapper.toDto(save)
        }
        const save = await this.testResultRepository.createTestResult({userId, testId, result, testType: test.testType}) as TestResultEntity
        return testResultMapper.toDto(save)
    }

    private calculateIQ = async (userId: string, testId: string, answers: AnswerDto[]): Promise<IqTestResult> => { 
        const questions = await this.testRepository.getTestQuestions(testId) as TestQuestionsEntity | null
        if (!questions || !('scoring' in questions.questions) || !('results' in questions.questions)) throw new InternalServerErrorException('Options for calculate results not found')

        const res: IqTestResult = {
            iq: 0,
            blocks: {a: 0, b: 0, c: 0, d: 0, e: 0},
            reliability: 'valid'
        }
        const scoring: Scoring = questions.questions.scoring
        const results: Results = questions.questions.results

        answers.forEach((answer) => {
        const block = answer.questionId[0]
            if (!(block in res.blocks)) return
            res.blocks[block] += scoring[answer.questionId]?.[answer.optionId] ?? 0
        })

        const score = (res.blocks.a + res.blocks.b + res.blocks.c + res.blocks.d + res.blocks.e)

        if(!(score in results)){
            res.reliability = 'invalid'
            return res
        }
        const expected: Result = results[score]
        res.iq = expected.iq

        const deviations = Object.entries(res.blocks).map(([block, value]) => {
            return Math.abs(value - expected[block])
        })
        const hasAbove2 = deviations.some(d => d > 2);
        const sum = deviations.reduce((acc, d) => acc + d, 0);
        const isSumAbove6 = sum > 6;
        if(hasAbove2 || isSumAbove6){
            res.reliability = 'suspicious'
        }

        return res
    }

    private calculateSzondi = async (userId: string, testId: string, answers: AnswerDto[]): Promise<SzondiTestResult> => {
        return {}
    }
    private calculateArchetype = async (userId: string, testId: string, answers: AnswerDto[]): Promise<ArchetypeTestResult> => {
        return {}
    }
    private calculateMBTI = async (userId: string, testId: string, answers: AnswerDto[]): Promise<MbtiTestResult> => {
        return {}
    }
}
