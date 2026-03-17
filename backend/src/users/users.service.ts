import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from './user.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from 'generated/prisma/client';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UsersService {
    constructor(
        @Inject('USER_REPOSITORY') private readonly userRepository: UserRepository,
        private readonly mailService: MailService
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        return await this.userRepository.create(createUserDto);
    }

    async getAllUsers(): Promise<User[]> {
        await this.mailService.sendUserConfirmation("rachasasian@gmail.com");
        return await this.userRepository.getAllUsers();
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.getUserByEmail(email);
    }

    async getUserById(id: string): Promise<User | null> {
        return await this.userRepository.getUserById(id);
    }

    async changePassword(id: string, password: string): Promise<void> {
        return await this.userRepository.changePassword(id, password);
    }
}
