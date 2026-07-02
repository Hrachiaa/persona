import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { tests, testQuestions } from "./tests.seed";

@Injectable()
export class TestRepository {
    constructor(private readonly prisma: PrismaService) {}

    // Idempotently seed the 6 tests, keyed by their unique testType. Safe to run on
    // every boot and from any partial state (0, some, or all tests already present) —
    // replaces the old "create exactly 6 or nothing" branch that could duplicate or
    // throw when the row count was anything but 0 or 6. Returns the rows so the
    // caller can sync each test's question bank.
    async upsertTests(): Promise<{ id: string; testType: string }[]> {
        const defs = [tests.iq, tests.bigFive, tests.shcwartz, tests.ecr, tests.cope, tests.pid]
        const rows: { id: string; testType: string }[] = []
        for (const def of defs) {
            const row = await this.prisma.test.upsert({
                where: { testType: def.testType },
                update: {
                    testName: def.testName,
                    description: def.description,
                    duration: def.duration,
                    totalQuestions: def.totalQuestions,
                },
                create: def,
            })
            rows.push({ id: row.id, testType: row.testType })
        }
        return rows
    }

    async getAllTests() {
        return await this.prisma.test.findMany()
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