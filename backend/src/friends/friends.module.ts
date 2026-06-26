import { forwardRef, Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { CompatibilityService } from './compatibility.service';
import { FriendRepository } from './friend.repository';
import { CompatibilityRepository } from './compatibility.repository';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { TestsModule } from '../tests/tests.module';

@Module({
  controllers: [FriendsController],
  providers: [
    FriendsService,
    CompatibilityService,
    FriendRepository,
    CompatibilityRepository,
    PrismaService,
  ],
  imports: [AuthModule, AiModule, UsersModule, forwardRef(() => TestsModule)],
  exports: [CompatibilityService, FriendsService, CompatibilityRepository],
})
export class FriendsModule {}
