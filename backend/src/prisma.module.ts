import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Single, app-wide Prisma client. Registered @Global so every feature module gets
// the SAME instance (one connection pool) instead of each module providing its own
// PrismaService — which spun up a separate PrismaClient (and pool) per module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
