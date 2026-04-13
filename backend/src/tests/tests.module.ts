import { Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { PrismaService } from 'src/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { TestResultRepository } from './test-result.repository';
import { TestRepository } from './test.repository';

@Module({
  controllers: [TestsController],
  providers: [
    TestsService,
    PrismaService,
    TestRepository,
    TestResultRepository,
  ],
  imports: [AuthModule]
})
export class TestsModule {}
