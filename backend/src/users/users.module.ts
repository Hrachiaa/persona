import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma.service';
import { UserPrismaRepository } from './user.prisma.repository';
import { UserRepository } from './user.repository';

@Module({
    controllers: [],
    providers: [],
    exports: [],
})
export class UsersModule { }
