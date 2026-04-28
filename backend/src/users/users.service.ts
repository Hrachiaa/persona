import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from '../../generated/prisma/client';
import { UserEntity } from './models/user.entity';
import { AuthDto } from './dtos/auth.dto';
import { AddProfileInfoDto } from '../auth/dtos/add-profile-info.dto';
import { UserRepository } from './user.repository';

@Injectable()
export class UsersService {
    constructor(
        private readonly userRepository: UserRepository,
    ) { }

    async create(authDto: AuthDto): Promise<User> {
        return await this.userRepository.create(authDto);
    }

    async getAllUsers(): Promise<User[]> {
        return await this.userRepository.getAllUsers();
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.getUserByEmail(email);
    }

    async getUserById(id: string): Promise<User | null> {
        return await this.userRepository.getUserById(id);
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>{
        const user: UserEntity | null = await this.getUserById(userId);
        if(!user){
            throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
        } 
        if(!user.password){
            throw new HttpException('Invalid password', HttpStatus.BAD_REQUEST);
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if(!isPasswordValid){
            throw new HttpException('Invalid password', HttpStatus.BAD_REQUEST);
        }
        const hashPassword = await bcrypt.hash(newPassword, 8);
        await this.userRepository.changePassword(userId, hashPassword);
    }

    async addProfileInfo(id: string, profileInfoDto: AddProfileInfoDto): Promise<void> {
        return await this.userRepository.addProfileInfo(id, profileInfoDto);
    }

    async addGoogleInfo(id: string, googleId: string): Promise<UserEntity> {
        return await this.userRepository.addGoogleInfo(id, googleId);
    }

    async resetPassword(id: string, password: string): Promise<void> {
        return await this.userRepository.changePassword(id, password);
    }
}
