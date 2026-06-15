import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { TestsModule } from './tests/tests.module';
import { PortraitModule } from './portrait/portrait.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    UsersModule,
    AuthModule,
    MailModule,
    TestsModule,
    PortraitModule,
    RecommendationsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

