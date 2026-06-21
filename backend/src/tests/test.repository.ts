import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { tests, testQuestions } from "./tests.seed";

@Injectable()
export class TestRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createTests() {
        const bigFive = await this.prisma.test.create({
            data: tests.bigFive
        })
        const schwartz = await this.prisma.test.create({
            data: tests.shcwartz
        })
        const cope = await this.prisma.test.create({
            data: tests.cope
        })
        const iq = await this.prisma.test.create({
            data: tests.iq
        })
        const ecr = await this.prisma.test.create({
            data: tests.ecr
        })
        const pid = await this.prisma.test.create({
            data: tests.pid
        })
        return { iq, bigFive, schwartz, ecr, cope, pid }
    }
    
    async createQuestions(iqId, bigFiveId, archetypeId, ecrId, copeId, pidId) {
        const iqQuestions = await this.prisma.testQuestion.createMany({
            data: [
                {testId: iqId, questions: testQuestions.iq.questions},
                {testId: bigFiveId, questions: testQuestions.bigFive.questions},
                {testId: archetypeId, questions: testQuestions.shcwartz.questions},
                {testId: ecrId, questions: testQuestions.ecr.questions},
                {testId: copeId, questions: testQuestions.cope.questions},
                {testId: pidId, questions: testQuestions.pid.questions},
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

    // Re-sync the stored question banks from the seed for existing tests, so seed
    // edits (e.g. translations) take effect on restart without a manual reseed.
    // Questions are seed-managed (no admin editing), so overwriting is safe.
    async syncQuestions(existingTests: { id: string; testType: string }[]) {
        const byType: Record<string, unknown> = {
            iq: testQuestions.iq.questions,
            bigFive: testQuestions.bigFive.questions,
            shcwartz: testQuestions.shcwartz.questions,
            ecr: testQuestions.ecr.questions,
            cope: testQuestions.cope.questions,
            pid: testQuestions.pid.questions,
        }
        for (const test of existingTests) {
            const questions = byType[test.testType]
            if (!questions) continue
            await this.prisma.testQuestion.upsert({
                where: { testId: test.id },
                update: { questions: questions as any },
                create: { testId: test.id, questions: questions as any },
            })
        }
    }
}