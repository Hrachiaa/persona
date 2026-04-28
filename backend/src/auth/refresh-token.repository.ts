import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export interface RefreshToken {
    id: string;
    userId: string;
    token: string;
}

export interface RefreshTokenRepositoryInterface {
    create(userId: string, token: string): Promise<RefreshToken>;
    findByUserId(userId: string): Promise<RefreshToken | null>;
    findByToken(token: string): Promise<RefreshToken | null>;
    deleteByUserId(userId: string): Promise<void>;
}

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryInterface {
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

    async deleteByUserId(userId: string): Promise<void> {
        await this.prisma.refreshToken.delete({ where: { userId } });
    }
}