import { PrismaService } from "../prisma.service";
import type { OtpCodeRepository } from "./otp-code.repository";
import { OtpCodeEntity } from "./models/otp-code.entity";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OtpCodePrismaRepository implements OtpCodeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, code: string): Promise<void> {
        await this.prisma.otpCode.create({
            data: {
                userId,
                code,
            },
        });
    }

    async findByUserId(userId: string): Promise<OtpCodeEntity | null> {
        return await this.prisma.otpCode.findUnique({
            where: {
                userId,
            },
        });
    }

    async incrementAttempts(id: string): Promise<void> {
        await this.prisma.otpCode.update({
            where: { id },
            data: { attempts: { increment: 1 } },
        });
    }

    async deleteById(id: string): Promise<void> {
        await this.prisma.otpCode.delete({
            where: {
                id,
            },
        });
    }
}