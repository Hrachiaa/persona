import { User } from "generated/prisma/client";
import { CreateUserDto } from "./dtos/create-user.dto";

export interface UserRepository {
    create(data: CreateUserDto): Promise<User>;
    getAllUsers(): Promise<User[]>;
    getUserByEmail(email: string): Promise<User | null>;
}