import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserEntity } from './models/user.enity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, type: UserEntity, description: 'The user has been successfully created.' })
    @Post()
    async create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
        return await this.usersService.create(createUserDto);
    }

    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, type: [UserEntity], description: 'The users has been successfully retrieved.' })
    @UseGuards(JwtAuthGuard)
    @Get()
    async getAllUsers(): Promise<UserEntity[]> {
        return await this.usersService.getAllUsers();
    }
}