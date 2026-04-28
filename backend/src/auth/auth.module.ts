import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenRepository } from './refresh-token.repository';
import { PrismaService } from '../prisma.service';
import { MailModule } from '../mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import googleOauthConfig from './config/google-oauth.config';
import { GoogleStrategy } from './google.strategy';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    JwtModule.register({}),
    MailModule,
    ConfigModule.forFeature(googleOauthConfig),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    GoogleStrategy,
    RefreshTokenRepository,
  ],
  exports: [
    AuthService,
    JwtModule,
  ]
})
export class AuthModule {}
