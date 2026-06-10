import { forwardRef, Module } from '@nestjs/common';
import { PortraitController } from './portrait.controller';
import { PortraitService } from './portrait.service';
import { PortraitRepository } from './portrait.repository';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { TestsModule } from '../tests/tests.module';

@Module({
  controllers: [PortraitController],
  providers: [PortraitService, PortraitRepository, PrismaService],
  imports: [AuthModule, AiModule, forwardRef(() => TestsModule)],
  exports: [PortraitService],
})
export class PortraitModule {}
