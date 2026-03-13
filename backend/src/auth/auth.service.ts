import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import { LoginDto } from 'src/users/dtos/login.dto';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'node_modules/bcryptjs';
import { User } from 'src/users/models/user.enity';

@Injectable()
export class AuthService {
    constructor(private readonly usersService: UsersService,
                private readonly jwtService: JwtService
    ) {}

    async register(registerDto: CreateUserDto){
        const condidate = await this.usersService.getUserByEmail(registerDto.email);
        if(condidate){
            throw new HttpException('User with this email already exists', HttpStatus.BAD_REQUEST);
        }
        const hashPassword = await bcrypt.hash(registerDto.password, 8);
        const user = await this.usersService.create({
            ...registerDto,
            password: hashPassword,
        });
        return this.generateTokens(user);
    }

    async login(loginDto: LoginDto){
    }

    async generateTokens(user: User){
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
        return {
            accessToken,
            refreshToken,
        }
    }
}
