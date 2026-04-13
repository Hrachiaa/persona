import { PrismaService } from "src/prisma.service";

export class TestResultRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createTestResult(data: {userId: string, testId: string, result: object, testType: string}) {
        return await this.prisma.testResult.create({data})
    }
}