import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserEntity } from "./models/user.entity";
import { AddProfileInfoDto } from "../auth/dtos/add-profile-info.dto";

// Server-side shape for creating a user. `googleId` / `emailVerified` are never
// taken from the HTTP body (see AuthDto) — only set here by the OAuth flow.
// `language` seeds the UI language from the signup screen (validated by SignupDto);
// omitted → the column default applies.
export interface CreateUserData {
    email: string;
    password: string;
    googleId?: string;
    emailVerified?: boolean;
    language?: string;
}

export interface UserRepositoryInterface {
    create(data: CreateUserData): Promise<UserEntity>;
    getUserByEmail(email: string): Promise<UserEntity | null>;
    getUserById(id: string): Promise<UserEntity | null>;
    getUserByInviteToken(inviteToken: string): Promise<UserEntity | null>;
    setInviteToken(id: string, inviteToken: string): Promise<void>;
    changePassword(id: string, password: string): Promise<void>;
    addProfileInfo(id: string, profileInfoDto: AddProfileInfoDto): Promise<void>;
    updateLanguage(id: string, language: string): Promise<void>;
    addGoogleInfo(id: string, googleId: string): Promise<UserEntity>;
}

@Injectable()
export class UserRepository implements UserRepositoryInterface {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: CreateUserData): Promise<UserEntity> {
        return await this.prisma.user.create({ data });
    }

    async getUserByEmail(email: string): Promise<UserEntity | null> {
        return await this.prisma.user.findUnique({ where: { email } });
    }

    async getUserById(id: string): Promise<UserEntity | null> {
        return await this.prisma.user.findUnique({ where: { id } });
    }

    async getUserByInviteToken(inviteToken: string): Promise<UserEntity | null> {
        return await this.prisma.user.findUnique({ where: { inviteToken } });
    }

    async setInviteToken(id: string, inviteToken: string): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: { inviteToken } });
    }

    async changePassword(id: string, password: string): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: { password } });
    }

    async addProfileInfo(id: string, profileInfoDto: AddProfileInfoDto): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: profileInfoDto });
    }

    async updateLanguage(id: string, language: string): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: { language } });
    }

    async addGoogleInfo(id: string, googleId: string): Promise<UserEntity> {
        return await this.prisma.user.update({ where: { id }, data: { googleId, emailVerified: true } });
    }
}