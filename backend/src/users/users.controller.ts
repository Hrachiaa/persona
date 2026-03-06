import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { LogInDto } from './dtos/login-user.dto';
import { User } from 'generated/prisma/client';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    async create(@Body() createUserDto: CreateUserDto): Promise<User> {
        return await this.usersService.create(createUserDto);
    }

    @Post('login')
    async login(@Body() loginUserDto: LogInDto): Promise<User> {
        return await this.usersService.login(loginUserDto);
    }
}
