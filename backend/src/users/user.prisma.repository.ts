import { PrismaService } from "src/prisma.service";
import { UserRepository } from "./user.repository";
import { CreateUserDto } from "./dtos/create-user.dto";
import { User } from "./entities/user.enity";
import { LogInDto } from "./dtos/login-user.dto";
import { Prisma } from "generated/prisma/client";

export class UserPrismaRepository implements UserRepository {
    constructor(private readonly userRepository: PrismaService) { }

    async create(data: CreateUserDto): Promise<User> {
        return await this.userRepository.user.create({ data });
    }

    async login(data: LogInDto): Promise<User> {
        const user: Prisma.UserGetPayload<{}> | null = await this.userRepository.user.findUnique({ where: { email: data.email } });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}