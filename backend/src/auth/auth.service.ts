import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto'
import { AuthDto } from '../users/dtos/auth.dto';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/models/user.entity';
import { MailService } from '../mail/mail.service';
import { AddProfileInfoDto } from './dtos/add-profile-info.dto';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class AuthService {
    constructor(
                private readonly usersService: UsersService,
                private readonly jwtService: JwtService,
                private readonly mailService: MailService,
                private readonly refreshTokenRepository: RefreshTokenRepository,
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
        const {accessToken, refreshToken} = await this.generateTokens(user);
        return {
            userId: user.id,
            accessToken,
            refreshToken,
        }
    }

    async addProfileInfo(userId: string, profileInfoDto: AddProfileInfoDto){
        const user = await this.usersService.getUserById(userId);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        await this.usersService.addProfileInfo(userId, profileInfoDto);
        return;
    }

    async getUserInfo(userId: string){
        const user = await this.usersService.getUserById(userId);
        if(!user){
            throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
        }
        return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            googleId: user.googleId,
            name: user.name,
            birthDate: user.birthDate,
            gender: user.gender,
        };
    }

    async login(loginDto: AuthDto){
        const user = await this.validateUser(loginDto);
        const {accessToken, refreshToken} = await this.generateTokens(user);
        return {
            userId: user.id,
            accessToken,
            refreshToken,
        }
    }

    async googleLogin(user: UserEntity){
        const {accessToken, refreshToken} = await this.generateTokens(user);
        return {
            userId: user.id,
            accessToken,
            refreshToken,
        }
    }

    private async generateTokens(user: UserEntity){
        const payload = {
            id: user.id,
            email: user.email,
        }
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: '30m',
            secret: process.env.JWT_ACCESS_SECRET,
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
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
        if(user.password === '' || loginDto.password === ''){
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
            await this.refreshTokenRepository.deleteByUserId(userId);
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
        const payload = this.jwtService.decode(refreshToken)
        await this.refreshTokenRepository.deleteByUserId(payload.id);
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

    async validateGoogleUser(googleUser: AuthDto): Promise<UserEntity>{
        const user = await this.usersService.getUserByEmail(googleUser.email); 
        if(user){
            if(user.googleId && user.emailVerified){
                return user;
            }
            const newUser = await this.usersService.addGoogleInfo(user.id, googleUser.googleId!);
            return newUser;
        } else {
            const newUser = await this.usersService.create(googleUser);
            return newUser;
        }
    }
}
