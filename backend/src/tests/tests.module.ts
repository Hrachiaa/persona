import { forwardRef, Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { TestResultRepository } from './test-result.repository';
import { TestRepository } from './test.repository';
import { UsersModule } from '../users/users.module';
import { TestScoringService } from './test-scoring.service';
import { PortraitModule } from '../portrait/portrait.module';

@Module({
  controllers: [TestsController],
  providers: [
    TestsService,
    PrismaService,
    TestRepository,
    TestResultRepository,
    TestScoringService,
  ],
  imports: [AuthModule, UsersModule, forwardRef(() => PortraitModule)],
  exports: [TestResultRepository],
})
export class TestsModule {}
