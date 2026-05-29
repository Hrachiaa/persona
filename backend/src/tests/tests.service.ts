import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { TestRepository } from './test.repository';
import { TestResultRepository } from './test-result.repository';
import { SubmitTestDto, AnswerDto } from './dtos/submit-test.dto';
import { TestResultDto } from './dtos/test-result.dto';
import { IqTestResult, EcrResult, BigFiveResults, ShcwartzTestResult, TestResultEntity } from './models/test-result.entity';
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
        await this.testRepository.createQuestions(tests.iq.id, tests.bigFive.id, tests.schwartz.id, tests.ecr.id)
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
            shcwartz: this.calculateSchwartz,
            ecr: this.calculateEcr
        }

        const result: IqTestResult | BigFiveResults | ShcwartzTestResult | EcrResult = await calculators[test.testType](userId, testId, answers.answers)

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
        if(answers.length !== 120){throw new BadRequestException('Count of answers has to be 120')}
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
    private calculateSchwartz = async (userId: string, testId: string, answers: AnswerDto[]): Promise<ShcwartzTestResult> => {
        if(answers.length !== 57){throw new BadRequestException('Count of answers has to be 57')}

        const res: ShcwartzTestResult = {
            values: {
                1: {name: 'Self-Direction: Autonomy of Thought', description: `Freedom to cultivate one's own ideas`, score: 0},
                2: {name: 'Self-Direction: Autonomy of Action', description: `Freedom to determine one's own actions`, score: 0},
                3: {name: 'Stimulation', description: 'Excitement, novelty, and change', score: 0},
                4: {name: 'Hedonism', description: 'Pleasure or sensuous gratification', score: 0},
                5: {name: 'Achievement', description: 'Success according to social standards', score: 0},
                6: {name: 'Power: Dominance over people', description: '', score: 0},
                7: {name: 'Power: Resources', description: 'Wealth and material resources', score: 0},
                8: {name: 'Face', description: 'Maintaining public image', score: 0},
                9: {name: 'Security: Societal', description: 'Security in the wider society', score: 0},
                10: {name: 'Security: Personal', description: `Security of self and one's immediate environment`, score: 0},
                11: {name: 'Tradition', description: 'Maintaining and preserving cultural, family and/or religious traditions', score: 0},
                12: {name: 'Conformity: Rules', description: 'Compliance with rules, laws and formal obligations', score: 0},
                13: {name: 'Conformity: Interpersonal', description: 'Avoidance of upsetting or harming others', score: 0},
                14: {name: 'Humility', description: `Recognizing one's insignificance in the larger scheme of things`, score: 0},
                15: {name: 'Benevolence: Dependability', description: 'Trustworthy and reliable', score: 0},
                16: {name: 'Benevolence: Caring', description: 'Devotion to the needs of the in-group', score: 0},
                17: {name: 'Universalism: Concern', description: 'Equality, justice and protection for the weak in society', score: 0},
                18: {name: 'Universalism: Nature', description: 'Preservation of the natural environment', score: 0},
                19: {name: 'Universalism: Tolerance', description: 'Acceptance and understanding of those who differ from oneself', score: 0},
            
            },

            higherOrderValues: {
                1: {name: 'Self-Transcendence', description: 'Combine means for universalism-nature, universalism-concern, universalism-tolerance, benevolence-care, and benevolence-dependability', score: 0},
                2: {name: 'Self-Enhancement', description: 'Combine means for achievement, power dominance and power resources', score: 0},
                3: {name: 'Openness to change', description: 'Combine means for self-direction thought, self-direction action, stimulation and hedonism', score: 0},
                4: {name: 'Conservation', description: 'Combine means for security-personal, security-societal, tradition, conformity-rules, conformity-interpersonal', score: 0},
            }
        }
 
        answers.forEach(a => {
            res.values[a.questionId].score += Number(a.optionId)
        })
        
        let mediumScore = 0

        Object.keys(res.values).forEach(a => {
            const realScore = res.values[a].score / 3
            res.values[a].score = realScore
            mediumScore += realScore
        })

        Object.keys(res.values).forEach(a => {
            const centreScore = Math.round((res.values[a].score - mediumScore/19) * 100) / 100
            res.values[a].score = centreScore
        })

        res.higherOrderValues[1].score = Math.round(((res.values[15].score + res.values[16].score + res.values[17].score + res.values[18].score + res.values[19].score) / 5) * 100) / 100
        res.higherOrderValues[2].score = Math.round(((res.values[5].score + res.values[6].score + res.values[7].score) / 3) * 100) / 100
        res.higherOrderValues[3].score = Math.round(((res.values[1].score + res.values[2].score + res.values[3].score + res.values[4].score) / 4) * 100) / 100
        res.higherOrderValues[4].score = Math.round(((res.values[9].score + res.values[10].score + res.values[11].score + res.values[12].score + res.values[13].score) / 5) * 100) / 100

        return res
    }

    private calculateEcr = async (userId: string, testId: string, answers: AnswerDto[]): Promise<EcrResult> => {
        const res: EcrResult = {
            anxiety: 0,
            avoidance: 0
        }
        return res
    }
}
