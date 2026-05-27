import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { TestRepository } from './test.repository';
import { TestResultRepository } from './test-result.repository';
import { SubmitTestDto, AnswerDto } from './dtos/submit-test.dto';
import { TestResultDto } from './dtos/test-result.dto';
import { IqTestResult, MbtiTestResult, BigFiveResults, ArchetypeTestResult, TestResultEntity } from './models/test-result.entity';
import { TestEntity } from './models/test.entity';
import { GetTestsDto } from './dtos/get-tests.dto';
import { Result, Results, Scoring } from './models/iqtest-questions.entity';
import { TestQuestionsEntity } from './models/test-questions.entity';
import testResultMapper from './mappers/test-result.mapper';
import testMapper from './mappers/test.mapper';
import { QuestionsDto } from './dtos/test-questions.dto';
import { UsersService } from '../users/users.service';
import { testQuestions } from './tests.seed';

@Injectable()
export class TestsService implements OnModuleInit {
    constructor(
        private readonly usersService: UsersService,
        private readonly testRepository: TestRepository,
        private readonly testResultRepository: TestResultRepository,
    ) {}

    async onModuleInit() {
        const isExists = await this.testRepository.getAllTests()
        if(isExists.length === 4) return
        
        const tests = await this.testRepository.createTests()
        await this.testRepository.createQuestions(tests.iq.id, tests.bigFive.id, tests.archetype.id, tests.mbti.id)
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
            bigFive: this.calculateBigFive,
            archetype: this.calculateArchetype,
            mbti: this.calculateMBTI
        }

        const result: IqTestResult | BigFiveResults | ArchetypeTestResult | MbtiTestResult = await calculators[test.testType](userId, testId, answers.answers)

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

    private calculateBigFive = async (userId: string, testId: string, answers: AnswerDto[]): Promise<BigFiveResults> => {
        const user = await this.usersService.getUserById(userId)
        if(!user || !user.gender) throw new BadRequestException('Confirm gender of user')
        const scores = testQuestions.bigFive.questions.scoring[user.gender]

        const res: BigFiveResults = {
            E1: {name: 'Friendliness', score: 0},
            E2: {name: 'Gregariousness', score: 0},
            E3: {name: 'Assertiveness', score: 0},
            E4: {name: 'Activity Level', score: 0},
            E5: {name: 'Excitement-seeking', score: 0},
            E6: {name: 'Cheerfulness', score: 0},

            A1: {name: 'Trust', score: 0},
            A2: {name: 'Morality', score: 0},
            A3: {name: 'Altruism', score: 0},
            A4: {name: 'Cooperation', score: 0},
            A5: {name: 'Modesty', score: 0},
            A6: {name: 'Sympathy', score: 0},

            C1: {name: 'Self-efficacy', score: 0},
            C2: {name: 'Orderliness', score: 0},
            C3: {name: 'Dutifulness', score: 0},
            C4: {name: 'Achievement-striving', score: 0},
            C5: {name: 'Self-discipline', score: 0},
            C6: {name: 'Cautiousness', score: 0},

            N1: {name: 'Anxiety', score: 0},
            N2: {name: 'Anger', score: 0},
            N3: {name: 'Depression', score: 0},
            N4: {name: 'Self-consciousness', score: 0},
            N5: {name: 'Immoderation', score: 0},
            N6: {name: 'Vulnerability', score: 0},

            O1: {name: 'Imagination', score: 0},
            O2: {name: 'Artistic Interests', score: 0},
            O3: {name: 'Emotionality', score: 0},
            O4: {name: 'Adventurousness', score: 0},
            O5: {name: 'Intellect', score: 0},
            O6: {name: 'Liberalism', score: 0},

            E: {name: 'Extraversion', score: 0},
            A: {name: 'Agreeableness', score: 0},
            C: {name: 'Conscientiousness', score: 0},
            N: {name: 'Neuroticism', score: 0},
            O: {name: 'Openness', score: 0}
        }

        answers.forEach((a)=> {
            res[a.questionId].score += Number(a.optionId)
            res[a.questionId[0]].score += Number(a.optionId)
        })

        Object.keys(res).forEach(key => {
            res[key].score = (50 + 10 * (res[key].score - scores[key].mean) / scores[key].sd)
        })
        console.log(res)
        return res

    }
    private calculateArchetype = async (userId: string, testId: string, answers: AnswerDto[]): Promise<ArchetypeTestResult> => {
        return {}
    }
    private calculateMBTI = async (userId: string, testId: string, answers: AnswerDto[]): Promise<MbtiTestResult> => {
        return {}
    }
}
