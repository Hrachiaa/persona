import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class TestResultRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createTestResult(data: {userId: string, testId: string, result: object, testType: string}) {
        return await this.prisma.testResult.create({data})
    }

    async getTestResults(userId: string) {
        return await this.prisma.testResult.findMany({where: {userId}})
    }
}