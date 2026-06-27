import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { TestsModule } from '../tests/tests.module';
import { PortraitModule } from '../portrait/portrait.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, PrismaService],
  imports: [AuthModule, AiModule, TestsModule, PortraitModule, FriendsModule],
})
export class ChatModule {}
