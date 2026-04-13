import { Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { TestRepository } from './test.repository';
import { TestResultRepository } from './test-result.repository';
import { IqTestAnswer, SubmitTestDto } from './dtos/submit-test.dto';
import { QuestionsDBTableEntity, Results, Scoring } from './entities/iq-test.questions.entity';

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

    async getAllTests(userId: string) {
        return await this.testRepository.getAllTestsWithResults(userId)
    }

    async getTestById(testId: string) {
        return await this.testRepository.getTestQuestions(testId)
    }

    async submitTest(userId: string, testId: string, answers: SubmitTestDto) {
        const test = await this.testRepository.getTestById(testId)
        if(!test) throw new InternalServerErrorException('Test not found')
        const calculators = {
            iq: this.calculateIQ,
            szondi: this.calculateSzondi,
            archetype: this.calculateArchetype,
            mbti: this.calculateMBTI,
        }

        const result = await calculators[test.testType](userId, testId, answers)

        return await this.testResultRepository.createTestResult({userId, testId, result, testType: test.testType})
    }

    private async calculateIQ(userId: string, testId: string, answers: IqTestAnswer[]){
        const questions = await this.testRepository.getTestQuestions(testId) as QuestionsDBTableEntity | null
        if(!questions) {throw new InternalServerErrorException('Options for calculate results not found')}

        const res = {
            a: 0,
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            score: 0
        }

        const scoring: Scoring = questions.questions.scoring
        const results: Results = questions.questions.results

        answers.forEach((answer) => {
        const block = answer.questionId[0]
            if (!(block in res)) return
            res[block] += scoring[answer.questionId]?.[answer.optionId] ?? 0
        })

        res.score = (res.a + res.b + res.c + res.d + res.e)

        
        const result = {
            iq: 0,
            
        }

    }

    private async calculateSzondi(){
        return {}
    }
    private async calculateArchetype(){
        return {}
    }
    private async calculateMBTI(){
        return {}
    }
}
