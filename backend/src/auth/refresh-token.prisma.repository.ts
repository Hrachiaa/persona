import { Injectable } from "@nestjs/common";
import { RefreshTokenRepository } from "./refresh-token.repository";
import { PrismaService } from "src/prisma.service";
import { RefreshToken } from "./refresh-token.repository";

@Injectable()
export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, token: string): Promise<RefreshToken> {
        return await this.prisma.refreshToken.create({ data: { userId, token } });
    }

    async findByUserId(userId: string): Promise<RefreshToken | null> {
        return await this.prisma.refreshToken.findUnique({ where: { userId } });
    }

    async findByToken(token: string): Promise<RefreshToken | null> {
        return await this.prisma.refreshToken.findUnique({ where: { token } });
    }

    async deleteByToken(token: string): Promise<void> {
        await this.prisma.refreshToken.delete({ where: { token } });
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.prisma.refreshToken.delete({ where: { userId } });
    }
}