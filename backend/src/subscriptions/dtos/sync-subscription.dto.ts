import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Payload the frontend sends right after Paddle's `checkout.completed` event.
 * With PADDLE_API_KEY configured the server only trusts `transactionId` (it
 * re-fetches the transaction from Paddle); the other fields exist for the
 * sandbox no-API-key fallback and are ignored otherwise.
 */
export class SyncSubscriptionDto {
  @ApiProperty({ description: 'Paddle txn_... id from checkout.completed', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  transactionId?: string;

  @ApiProperty({ description: 'Purchased pri_... id (sandbox fallback only)', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  priceId?: string;

  @ApiProperty({ description: 'Paddle ctm_... id (sandbox fallback only)', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  customerId?: string;
}
