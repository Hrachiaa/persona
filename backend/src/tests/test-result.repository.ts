import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class TestResultRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createTestResult(data: {userId: string, testId: string, result: object, testType: string, shareToken?: string}) {
        return await this.prisma.testResult.create({data})
    }

    async updateTestResult(userId: string, testId: string, result: object) {
        return await this.prisma.testResult.update({where: {userId_testId: {userId, testId}}, data: {result}})
    }

    async getTestResults(userId: string) {
        return await this.prisma.testResult.findMany({where: {userId}})
    }

    async getTestResultsWithTest(userId: string) {
        return await this.prisma.testResult.findMany({
            where: {userId},
            include: {test: {select: {testName: true}}},
        })
    }

    async getTestResult(userId: string, testId: string) {
        return await this.prisma.testResult.findUnique({where: {userId_testId: {userId, testId}}})
    }

    async setShareToken(userId: string, testId: string, shareToken: string) {
        return await this.prisma.testResult.update({where: {userId_testId: {userId, testId}}, data: {shareToken}})
    }

    async getByShareToken(shareToken: string) {
        return await this.prisma.testResult.findUnique({
            where: {shareToken},
            include: {user: {select: {name: true}}, test: {select: {testName: true}}},
        })
    }
}