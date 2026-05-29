import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { tests, testQuestions } from "./tests.seed";

@Injectable()
export class TestRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createTests() {
        const iq = await this.prisma.test.create({
            data: tests.iq
        })
        const bigFive = await this.prisma.test.create({
            data: tests.bigFive
        })
        const schwartz = await this.prisma.test.create({
            data: tests.shcwartz
        })
        const ecr = await this.prisma.test.create({
            data: tests.ecr
        })
        return { iq, bigFive, schwartz, ecr }
    }
    
    async createQuestions(iqId, bigFiveId, archetypeId, ecrId) {
        const iqQuestions = await this.prisma.testQuestion.createMany({
            data: [
                {testId: iqId, questions: testQuestions.iq.questions},
                {testId: bigFiveId, questions: testQuestions.bigFive.questions},
                {testId: archetypeId, questions: testQuestions.shcwartz.questions},
                {testId: ecrId, questions: testQuestions.ecr.questions},
            ]
        })
        return
    }

    async getAllTests() {
        return await this.prisma.test.findMany()
    }

    async getAllTestsWithResults(userId){
        return await this.prisma.test.findMany({
            include: {
                testResults: {
                    where: {userId}
                }
            }
        })
    }

    async getTestById(id){
        return await this.prisma.test.findUnique({where: {id}})
    }

    async getTestQuestions(testId){
        return await this.prisma.testQuestion.findUnique({
            where: {testId}
        })
    }
}