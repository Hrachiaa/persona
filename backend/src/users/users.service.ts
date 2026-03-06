import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from './user.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import { LogInDto } from './dtos/login-user.dto';
import { User } from 'generated/prisma/client';

@Injectable()
export class UsersService {
    constructor(private readonly userRepository: UserRepository) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        return await this.userRepository.create(createUserDto);
    }

    async login(loginUserDto: LogInDto): Promise<User> {
        return await this.userRepository.login(loginUserDto);
    }
}
