import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRepository } from './user.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        forwardRef(() => AuthModule),
    ],
    controllers: [],
    providers: [
        UsersService,
        UserRepository
    ],
    exports: [
        UsersService,
    ],
})
export class UsersModule { }
