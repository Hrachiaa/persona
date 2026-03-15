import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenPrismaRepository } from './refresh-token.prisma.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    {
      provide: 'REFRESH_TOKEN_REPOSITORY',
      useClass: RefreshTokenPrismaRepository,
    }
  ],
  exports: [
    AuthService,
    JwtModule,
  ]
})
export class AuthModule {}
