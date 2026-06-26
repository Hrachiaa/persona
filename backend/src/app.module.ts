import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule, AcceptLanguageResolver, HeaderResolver, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
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
  providers: [],
})
export class AppModule {}

