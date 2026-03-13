import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma.service';
import { UserPrismaRepository } from './user.prisma.repository';

@Module({
    controllers: [UsersController],
    providers: [
        PrismaService,
        UsersService,
        {
            provide: 'USER_REPOSITORY',
            useClass: UserPrismaRepository,
        },
    ],
    exports: [UsersService],
})
export class UsersModule { }
