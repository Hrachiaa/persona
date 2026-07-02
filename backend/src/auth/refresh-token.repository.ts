import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export interface RefreshToken {
    id: string;
    userId: string;
    token: string;
}

export interface RefreshTokenRepositoryInterface {
    create(userId: string, token: string): Promise<RefreshToken>;
    findByToken(token: string): Promise<RefreshToken | null>;
    deleteByToken(token: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
}

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryInterface {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, token: string): Promise<RefreshToken> {
        return await this.prisma.refreshToken.create({ data: { userId, token } });
    }

    async findByToken(token: string): Promise<RefreshToken | null> {
        return await this.prisma.refreshToken.findUnique({ where: { token } });
    }

    // deleteMany (not delete) so logging out with an already-removed token is a
    // no-op instead of throwing. `token` is unique, so this affects at most one row.
    async deleteByToken(token: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({ where: { token } });
    }

    // Ends every session for a user (e.g. after a password reset). The default
    // logout ends only the current session (deleteByToken).
    async deleteAllForUser(userId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
}