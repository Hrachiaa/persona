import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { EntitlementDto, PaddleConfigDto } from './dtos/subscription.dto';
import { SyncSubscriptionDto } from './dtos/sync-subscription.dto';
import { paddleConfig } from './paddle.config';
import { verifyPaddleSignature } from './paddle-webhook';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @ApiResponse({ status: 200, description: 'Paddle.js bootstrap config (env, client token, plans)', type: PaddleConfigDto })
  @UseGuards(JwtAuthGuard)
  @Get('config')
  config(): PaddleConfigDto {
    return this.subscriptionsService.getConfig();
  }

  @ApiResponse({ status: 200, description: "The user's Pro entitlement + free-message meter", type: EntitlementDto })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req): Promise<EntitlementDto> {
    return this.subscriptionsService.getEntitlement(req.user.id);
  }

  @ApiResponse({ status: 200, description: 'Confirm a finished checkout and activate Pro', type: EntitlementDto })
  @UseGuards(JwtAuthGuard)
  @Post('sync')
  sync(@Req() req, @Body() dto: SyncSubscriptionDto): Promise<EntitlementDto> {
    return this.subscriptionsService.syncFromCheckout(req.user.id, dto);
  }

  @ApiResponse({ status: 200, description: 'Schedule cancellation at period end', type: EntitlementDto })
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@Req() req): Promise<EntitlementDto> {
    return this.subscriptionsService.cancel(req.user.id);
  }

  @ApiResponse({ status: 200, description: 'Undo a scheduled cancellation', type: EntitlementDto })
  @UseGuards(JwtAuthGuard)
  @Post('resume')
  resume(@Req() req): Promise<EntitlementDto> {
    return this.subscriptionsService.resume(req.user.id);
  }

  // Paddle → server notifications. Deliberately unauthenticated: authenticity is
  // the HMAC signature over the raw body (main.ts boots with rawBody: true).
  // Non-2xx responses make Paddle retry with backoff, so config problems return
  // 5xx (retryable) while a bad signature is a hard 403.
  @ApiResponse({ status: 201, description: 'Paddle webhook sink (signature-verified)' })
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('paddle-signature') signature?: string,
  ): Promise<{ ok: true }> {
    const { webhookSecret } = paddleConfig();
    if (!webhookSecret) {
      throw new ServiceUnavailableException('PADDLE_WEBHOOK_SECRET is not configured');
    }
    if (!verifyPaddleSignature(req.rawBody, signature, webhookSecret)) {
      throw new ForbiddenException('Invalid Paddle signature');
    }
    await this.subscriptionsService.handleWebhook(req.body as { event_type?: string; data?: unknown });
    return { ok: true };
  }
}
