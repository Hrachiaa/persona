import { User } from "generated/prisma/client";
import { CreateUserDto } from "./dtos/create-user.dto";
import { LogInDto } from "./dtos/login-user.dto";

export interface UserRepository {
    create(data: CreateUserDto): Promise<User>;
    login(data: LogInDto): Promise<User>;
}