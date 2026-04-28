import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { UserRepository } from './user.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        forwardRef(() => AuthModule),
    ],
    controllers: [UsersController],
    providers: [
        PrismaService,
        UsersService,
        UserRepository
    ],
    exports: [
        UsersService,
    ],
})
export class UsersModule { }
