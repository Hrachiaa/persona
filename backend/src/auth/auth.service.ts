import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto'
import { AuthDto } from 'src/users/dtos/auth.dto';
import { UsersService } from 'src/users/users.service';
import { UserEntity } from 'src/users/models/user.enity';
import type { RefreshTokenRepository } from './refresh-token.repository';
import { MailService } from 'src/mail/mail.service';
import { AddProfileInfoDto } from './dtos/add-profile-info.dto';

@Injectable()
export class AuthService {
    constructor(
                private readonly usersService: UsersService,
                private readonly jwtService: JwtService,
                private readonly mailService: MailService,
                @Inject('REFRESH_TOKEN_REPOSITORY') private readonly refreshTokenRepository: RefreshTokenRepository,
    ) {}

    async signup(authDto: AuthDto){
        const condidate = await this.usersService.getUserByEmail(authDto.email);
        if(condidate){
            throw new HttpException('User with this email already exists', HttpStatus.BAD_REQUEST);
        }
        const hashPassword = await bcrypt.hash(authDto.password, 8);
        const user = await this.usersService.create({
            ...authDto,
            password: hashPassword,
        });
        return this.generateTokens(user);
    }

    async addProfileInfo(userId: string, profileInfoDto: AddProfileInfoDto){
        const user = await this.usersService.getUserById(userId);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        await this.usersService.addProfileInfo(userId, profileInfoDto);
        return;
    }

    async login(loginDto: AuthDto){
        const user = await this.validateUser(loginDto);
        return this.generateTokens(user);
    }

    private async generateTokens(user: UserEntity){
        const payload = {
            id: user.id,
            email: user.email,
        }
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '30m',
            secret: process.env.JWT_ACCESS_SECRET,
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '7d',
            secret: process.env.JWT_REFRESH_SECRET,
        });

        await this.saveRefreshToken(user.id, refreshToken);

        return {
            accessToken,
            refreshToken,
        }
    }

    private async validateUser(loginDto: AuthDto){
        const user = await this.usersService.getUserByEmail(loginDto.email);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        if(!user.password){
            throw new HttpException('Invalid password', HttpStatus.BAD_REQUEST);
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if(!isPasswordValid){
            throw new HttpException('Invalid password', HttpStatus.BAD_REQUEST);
        }
        return user;
    }

    private async saveRefreshToken(userId: string, token: string): Promise<void>{
        const existingToken = await this.refreshTokenRepository.findByUserId(userId);
        if(existingToken){
            await this.refreshTokenRepository.deleteByToken(existingToken.token);
        }

        const hashToken = createHmac('sha256', process.env.JWT_REFRESH_DB_SECRET!)
            .update(token)
            .digest('hex');
        await this.refreshTokenRepository.create(userId, hashToken);
    }

    async refreshTokens(refreshToken: string){
        const hashToken = createHmac('sha256', process.env.JWT_REFRESH_DB_SECRET!)
            .update(refreshToken)
            .digest('hex');
        const token = await this.refreshTokenRepository.findByToken(hashToken);
        if(!token){
            throw new HttpException('Invalid refresh token', HttpStatus.BAD_REQUEST);
        }
        const user = await this.usersService.getUserById(token.userId);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        return this.generateTokens(user);
    }

    async logout (refreshToken: string){
        await this.refreshTokenRepository.deleteByToken(refreshToken);
    }

    async forgotPassword(email: string){
        const user = await this.usersService.getUserByEmail(email);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        await this.mailService.sendCode(email, user.id);
        return
    }

    async forgotPasswordCode(email: string, code: string): Promise<Boolean>{
        const user = await this.usersService.getUserByEmail(email);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        const checkCode = await this.mailService.checkCode(user.id, code);
        if(!checkCode){
            throw new HttpException('Invalid code', HttpStatus.BAD_REQUEST);
        }
        return checkCode;
    }

    async changeForgottenPassword(email: string, code: string, newPassword: string){
        const user = await this.usersService.getUserByEmail(email);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        const checkCode = await this.mailService.checkCode(user.id, code);
        if(!checkCode){
            throw new HttpException('Invalid code', HttpStatus.BAD_REQUEST);
        }
        await this.mailService.deleteCode(user.id);
        const hashPassword = await bcrypt.hash(newPassword, 8);
        await this.usersService.resetPassword(user.id, hashPassword);
    }
}
