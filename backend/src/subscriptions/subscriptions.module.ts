import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionRepository } from './subscription.repository';
import { PaddleApiClient } from './paddle-api.client';
import { AuthModule } from '../auth/auth.module';

// Persona Pro subscriptions (Paddle Billing): checkout confirmation, webhook
// sink, entitlement checks and the free-message gate used by ChatModule.
@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionRepository, PaddleApiClient],
  imports: [AuthModule],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
