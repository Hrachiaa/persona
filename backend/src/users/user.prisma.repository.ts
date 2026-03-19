import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { UserRepository } from "./user.repository";
import { AuthDto } from "./dtos/auth.dto";
import { UserEntity } from "./models/user.enity";
import { AddProfileInfoDto } from "src/auth/dtos/add-profile-info.dto";

@Injectable()
export class UserPrismaRepository implements UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: AuthDto): Promise<UserEntity> {
        return await this.prisma.user.create({ data });
    }

    async getAllUsers(): Promise<UserEntity[]> {
        return await this.prisma.user.findMany();
    }

    async getUserByEmail(email: string): Promise<UserEntity | null> {
        return await this.prisma.user.findUnique({ where: { email } });
    }

    async getUserById(id: string): Promise<UserEntity | null> {
        return await this.prisma.user.findUnique({ where: { id } });
    }

    async changePassword(id: string, password: string): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: { password } });
    }

    async addProfileInfo(id: string, profileInfoDto: AddProfileInfoDto): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: profileInfoDto });
    }

    async addGoogleInfo(id: string, googleId: string): Promise<UserEntity> {
        return await this.prisma.user.update({ where: { id }, data: { googleId, emailVerified: true } });
    }
}