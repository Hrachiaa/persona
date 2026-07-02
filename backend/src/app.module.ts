import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { I18nModule, AcceptLanguageResolver, HeaderResolver, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { TestsModule } from './tests/tests.module';
import { PortraitModule } from './portrait/portrait.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { FriendsModule } from './friends/friends.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    // Global rate limiting: generous default (the SPA polls portrait/recommendations
    // while they generate); sensitive auth routes are tightened separately with
    // @Throttle, and per-account LLM endpoints with UserThrottlerGuard (common/).
    // In-memory store (per process) — multiple backend instances need a shared
    // store (@nestjs/throttler-storage-redis), same caveat as the in-process
    // generation dedup (see SingleFlight). Behind a reverse proxy, set TRUST_PROXY
    // (see main.ts) so the limiter keys off the real client IP, not the proxy's.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      // Read from src at runtime — same convention as the mail templates
      // (MailModule uses process.cwd() + '/src/mail/templates/').
      loaderOptions: {
        path: path.join(process.cwd(), 'src/i18n/'),
        watch: true,
      },
      // Language is taken from the frontend's Accept-Language header; the query /
      // header resolvers allow explicit overrides (e.g. testing).
      resolvers: [
        new QueryResolver(['lang']),
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    MailModule,
    TestsModule,
    PortraitModule,
    RecommendationsModule,
    FriendsModule,
    ChatModule,
  ],
  controllers: [],
  providers: [
    // Apply the throttler to every route by default.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

