import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { UserRepository } from "./user.repository";
import { CreateUserDto } from "./dtos/create-user.dto";
import { User } from "./models/user.enity";

@Injectable()
export class UserPrismaRepository implements UserRepository {
    constructor(private readonly userRepository: PrismaService) { }

    async create(data: CreateUserDto): Promise<User> {
        return await this.userRepository.user.create({ data });
    }

    async getAllUsers(): Promise<User[]> {
        return await this.userRepository.user.findMany();
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.user.findUnique({ where: { email } });
    }
}