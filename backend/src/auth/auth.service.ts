import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHmac, randomBytes } from 'crypto'
import { AuthDto } from '../users/dtos/auth.dto';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/models/user.entity';
import { MailService } from '../mail/mail.service';
import { AddProfileInfoDto } from './dtos/add-profile-info.dto';
import { RefreshTokenRepository } from './refresh-token.repository';
import { t } from '../i18n/translate';

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
            throw new HttpException(t('errors.userExists'), HttpStatus.BAD_REQUEST);
        }
        const hashPassword = await bcrypt.hash(authDto.password, 8);
        const user = await this.usersService.create({
            email: authDto.email,
            password: hashPassword,
        });
        const {accessToken, refreshToken} = await this.generateTokens(user);
        return {
            userId: user.id,
            accessToken,
            refreshToken,
        }
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string){
        await this.usersService.changePassword(userId, currentPassword, newPassword);
    }

    async addProfileInfo(userId: string, profileInfoDto: AddProfileInfoDto){
        const user = await this.usersService.getUserById(userId);
        if(!user){
            throw new HttpException(t('errors.userNotFound'), HttpStatus.BAD_REQUEST);
        }
        await this.usersService.addProfileInfo(userId, profileInfoDto);
        return;
    }

    async updateLanguage(userId: string, language: string){
        const user = await this.usersService.getUserById(userId);
        if(!user){
            throw new HttpException(t('errors.userNotFound'), HttpStatus.BAD_REQUEST);
        }
        await this.usersService.updateLanguage(userId, language);
        return;
    }

    async getUserInfo(userId: string){
        const user = await this.usersService.getUserById(userId);
        if(!user){
            throw new HttpException(t('errors.userNotFound'), HttpStatus.BAD_REQUEST);
        }
        return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            googleId: user.googleId,
            name: user.name,
            birthDate: user.birthDate,
            gender: user.gender,
            language: user.language,
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
        // jti makes each refresh token unique even if two are issued in the same
        // second (multiple devices) — the stored hash column is unique.
        const refreshToken = await this.jwtService.signAsync(
            { ...payload, jti: randomBytes(16).toString('hex') },
            {
                expiresIn: '7d',
                secret: process.env.JWT_REFRESH_SECRET,
            },
        );

        await this.saveRefreshToken(user.id, refreshToken);

        return {
            accessToken,
            refreshToken,
        }
    }

    private async validateUser(loginDto: AuthDto){
        // One neutral error for every failure mode (unknown email, OAuth-only
        // account with no password, wrong password) so login doesn't reveal which
        // emails are registered. Kept at 400 (not 401) so the frontend's 401 refresh
        // interceptor doesn't treat a bad-credentials login as an expired session.
        const invalid = () => new HttpException(t('errors.invalidCredentials'), HttpStatus.BAD_REQUEST);
        const user = await this.usersService.getUserByEmail(loginDto.email);
        if(!user || !user.password){
            throw invalid();
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if(!isPasswordValid){
            throw invalid();
        }
        return user;
    }

    private hashRefreshToken(token: string): string {
        return createHmac('sha256', process.env.JWT_REFRESH_DB_SECRET!)
            .update(token)
            .digest('hex');
    }

    // Store the token's hash as a new session row. Multiple rows per user are
    // allowed (one per device/login); rotation and logout remove a single row.
    private async saveRefreshToken(userId: string, token: string): Promise<void>{
        await this.refreshTokenRepository.create(userId, this.hashRefreshToken(token));
    }

    async refreshTokens(refreshToken: string){
        // Verify signature + expiry — a surviving DB row alone isn't enough (the JWT
        // itself could be expired or forged).
        try {
            this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
        } catch {
            throw new HttpException(t('errors.invalidRefreshToken'), HttpStatus.UNAUTHORIZED);
        }

        const hashToken = this.hashRefreshToken(refreshToken);
        const token = await this.refreshTokenRepository.findByToken(hashToken);
        if(!token){
            throw new HttpException(t('errors.invalidRefreshToken'), HttpStatus.UNAUTHORIZED);
        }
        const user = await this.usersService.getUserById(token.userId);
        if(!user){
            throw new HttpException(t('errors.invalidRefreshToken'), HttpStatus.UNAUTHORIZED);
        }
        // Rotate: invalidate the presented token and issue a fresh pair.
        await this.refreshTokenRepository.deleteByToken(hashToken);
        return this.generateTokens(user);
    }

    async logout (refreshToken: string){
        // Idempotent: end only this session's row. An invalid/expired token has no
        // valid session to end, so it's a no-op — never a 500.
        try {
            this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
        } catch {
            return;
        }
        await this.refreshTokenRepository.deleteByToken(this.hashRefreshToken(refreshToken));
    }

    async forgotPassword(email: string){
        // Never reveal whether the email is registered — always return OK, and only
        // actually send a code when a matching account exists.
        const user = await this.usersService.getUserByEmail(email);
        if(user){
            await this.mailService.sendCode(email, user.id);
        }
        return
    }

    async forgotPasswordCode(email: string, code: string): Promise<Boolean>{
        const user = await this.usersService.getUserByEmail(email);
        const checkCode = user ? await this.mailService.checkCode(user.id, code) : false;
        if(!checkCode){
            throw new HttpException(t('errors.invalidCode'), HttpStatus.BAD_REQUEST);
        }
        return checkCode;
    }

    async changeForgottenPassword(email: string, code: string, newPassword: string){
        const user = await this.usersService.getUserByEmail(email);
        const checkCode = user ? await this.mailService.checkCode(user.id, code) : false;
        if(!user || !checkCode){
            throw new HttpException(t('errors.invalidCode'), HttpStatus.BAD_REQUEST);
        }
        await this.mailService.deleteCode(user.id);
        const hashPassword = await bcrypt.hash(newPassword, 8);
        await this.usersService.resetPassword(user.id, hashPassword);
    }

    async validateGoogleUser(googleUser: { email: string; googleId: string }): Promise<UserEntity>{
        const user = await this.usersService.getUserByEmail(googleUser.email);
        if(user){
            if(user.googleId && user.emailVerified){
                return user;
            }
            return await this.usersService.addGoogleInfo(user.id, googleUser.googleId);
        }
        // New OAuth user: emailVerified is asserted by Google here, never taken from
        // a client request body.
        return await this.usersService.create({
            email: googleUser.email,
            password: '',
            googleId: googleUser.googleId,
            emailVerified: true,
        });
    }
}
