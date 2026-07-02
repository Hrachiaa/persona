import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from '../../generated/prisma/client';
import { UserEntity } from './models/user.entity';
import { AddProfileInfoDto } from '../auth/dtos/add-profile-info.dto';
import { UserRepository, CreateUserData } from './user.repository';
import { t } from '../i18n/translate';
import { BCRYPT_SALT_ROUNDS } from '../common/security';

@Injectable()
export class UsersService {
    constructor(
        private readonly userRepository: UserRepository,
    ) { }

    async create(data: CreateUserData): Promise<User> {
        return await this.userRepository.create(data);
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.getUserByEmail(email);
    }

    async getUserById(id: string): Promise<User | null> {
        return await this.userRepository.getUserById(id);
    }

    async getUserByInviteToken(inviteToken: string): Promise<User | null> {
        return await this.userRepository.getUserByInviteToken(inviteToken);
    }

    async setInviteToken(id: string, inviteToken: string): Promise<void> {
        return await this.userRepository.setInviteToken(id, inviteToken);
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>{
        const user: UserEntity | null = await this.getUserById(userId);
        if(!user){
            throw new HttpException(t('errors.userNotFound'), HttpStatus.UNAUTHORIZED);
        } 
        if(!user.password){
            throw new HttpException(t('errors.invalidPassword'), HttpStatus.BAD_REQUEST);
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if(!isPasswordValid){
            throw new HttpException(t('errors.invalidPassword'), HttpStatus.BAD_REQUEST);
        }
        const hashPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
        await this.userRepository.changePassword(userId, hashPassword);
    }

    async addProfileInfo(id: string, profileInfoDto: AddProfileInfoDto): Promise<void> {
        return await this.userRepository.addProfileInfo(id, profileInfoDto);
    }

    async updateLanguage(id: string, language: string): Promise<void> {
        return await this.userRepository.updateLanguage(id, language);
    }

    async addGoogleInfo(id: string, googleId: string): Promise<UserEntity> {
        return await this.userRepository.addGoogleInfo(id, googleId);
    }

    async resetPassword(id: string, password: string): Promise<void> {
        return await this.userRepository.changePassword(id, password);
    }
}
