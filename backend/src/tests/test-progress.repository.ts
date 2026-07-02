import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class TestProgressRepository {
    constructor(private readonly prisma: PrismaService) {}

    async get(userId: string, testId: string) {
        return await this.prisma.testProgress.findUnique({ where: { userId_testId: { userId, testId } } })
    }

    async getAll(userId: string) {
        return await this.prisma.testProgress.findMany({ where: { userId } })
    }

    async upsert(data: { userId: string; testId: string; testType: string; answers: object; parts: number }) {
        const { userId, testId, testType, answers, parts } = data
        return await this.prisma.testProgress.upsert({
            where: { userId_testId: { userId, testId } },
            update: { answers, parts },
            create: { userId, testId, testType, answers, parts },
        })
    }

    // deleteMany so clearing a non-existent row (e.g. a non-chunked path) is a no-op
    // instead of throwing.
    async delete(userId: string, testId: string) {
        return await this.prisma.testProgress.deleteMany({ where: { userId, testId } })
    }
}
