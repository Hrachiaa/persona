import { ApiProperty } from '@nestjs/swagger';
import type { PaddleEnvironment, ProPlan } from '../paddle.config';

export type EntitlementStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled';

/** The user's Pro state — consumed by the chat paywall and the profile screen. */
export class EntitlementDto {
  @ApiProperty({ description: 'Whether paid features (AI chat) are unlocked' })
  entitled: boolean;
  @ApiProperty({ enum: ['none', 'trialing', 'active', 'past_due', 'paused', 'canceled'] })
  status: EntitlementStatus;
  @ApiProperty({ enum: ['weekly', 'monthly'], nullable: true })
  plan: ProPlan | null;
  @ApiProperty({ nullable: true, description: 'End of the paid-for period (renewal or expiry)' })
  currentPeriodEnd: string | null;
  @ApiProperty({ description: 'True when cancellation is scheduled for period end' })
  cancelAtPeriodEnd: boolean;
  @ApiProperty({ nullable: true })
  trialEndsAt: string | null;
  @ApiProperty({ description: 'Free chat messages already spent (capped at the limit)' })
  freeMessagesUsed: number;
  @ApiProperty()
  freeMessagesLimit: number;
}

export class PlanConfigDto {
  @ApiProperty({ description: 'Paddle pri_... id to pass to Paddle.Checkout.open' })
  priceId: string;
  @ApiProperty({ description: 'Display amount in `currency` (billing truth lives in Paddle)' })
  amount: number;
  @ApiProperty()
  currency: string;
  @ApiProperty({ enum: ['week', 'month'] })
  interval: 'week' | 'month';
  @ApiProperty({ description: 'Free-trial length in days; 0 = no trial' })
  trialDays: number;
}

/** Everything Paddle.js needs client-side. The client token is public by design. */
export class PaddleConfigDto {
  @ApiProperty({ enum: ['sandbox', 'production'] })
  environment: PaddleEnvironment;
  @ApiProperty()
  clientToken: string;
  @ApiProperty()
  freeMessagesLimit: number;
  @ApiProperty({ type: Object })
  prices: Record<ProPlan, PlanConfigDto>;
}
