import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SubscriptionRepository, SubscriptionWrite } from './subscription.repository';
import {
  PaddleApiClient,
  PaddleApiError,
  PaddleSubscriptionEntity,
} from './paddle-api.client';
import { paddleConfig, planForPrice, ProPlan } from './paddle.config';
import { SubscriptionStatus } from '../../generated/prisma/enums';
import type { Subscription } from '../../generated/prisma/client';
import { t } from '../i18n/translate';
import { EntitlementDto, EntitlementStatus, PaddleConfigDto } from './dtos/subscription.dto';
import { SyncSubscriptionDto } from './dtos/sync-subscription.dto';

// Free chat messages before the paywall, counted globally across every chat the
// user owns: the 1st and 2nd sends go through, the 3rd is rejected with 402 and
// the UI raises the Pro paywall (the "third message" rule).
export const FREE_MESSAGE_LIMIT = 2;

// Statuses that keep paid features unlocked. PAST_DUE stays entitled — Paddle is
// still retrying the charge, and cutting access over a card hiccup is punitive;
// a final failure moves the subscription to canceled/paused via webhook.
const ENTITLED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

const STATUS_FROM_PADDLE: Record<string, SubscriptionStatus> = {
  trialing: SubscriptionStatus.TRIALING,
  active: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  paused: SubscriptionStatus.PAUSED,
  canceled: SubscriptionStatus.CANCELED,
};

// Display metadata for the two Pro plans. Amounts are what the UI shows; what's
// actually charged is whatever the Paddle price is configured to (keep in sync).
const PLAN_DISPLAY: Record<ProPlan, { amount: number; currency: string; interval: 'week' | 'month'; trialDays: number }> = {
  weekly: { amount: 5, currency: 'USD', interval: 'week', trialDays: 3 },
  monthly: { amount: 10, currency: 'USD', interval: 'month', trialDays: 0 },
};

// Sandbox no-API-key fallback: provisional period lengths so the row expires
// roughly when Paddle would bill next (trial for the weekly plan, else a cycle).
const FALLBACK_PERIOD_DAYS: Record<ProPlan, number> = { weekly: 7, monthly: 30 };
const DAY_MS = 86_400_000;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly api: PaddleApiClient,
  ) {}

  /** Paddle.js bootstrap data for the frontend (token, env, the two plans). */
  getConfig(): PaddleConfigDto {
    const cfg = paddleConfig();
    if (!cfg.clientToken) this.logger.warn('PADDLE_CLIENT_TOKEN is not set — checkout cannot open');
    return {
      environment: cfg.environment,
      clientToken: cfg.clientToken,
      freeMessagesLimit: FREE_MESSAGE_LIMIT,
      prices: {
        weekly: { priceId: cfg.prices.weekly, ...PLAN_DISPLAY.weekly },
        monthly: { priceId: cfg.prices.monthly, ...PLAN_DISPLAY.monthly },
      },
    };
  }

  async getEntitlement(userId: string): Promise<EntitlementDto> {
    const sub = await this.freshSubscription(userId);
    const used = await this.repository.countUserMessages(userId);
    return this.toEntitlement(sub, used);
  }

  /**
   * The chat-send gate. Throws 402 with `error: 'SUBSCRIPTION_REQUIRED'` once
   * the free allowance is spent and there is no live subscription — the
   * frontend catches exactly that shape to raise the paywall and roll the
   * message back.
   */
  async assertCanSendMessage(userId: string): Promise<void> {
    if (this.isEntitled(await this.freshSubscription(userId))) return;
    const used = await this.repository.countUserMessages(userId);
    if (used < FREE_MESSAGE_LIMIT) return;
    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'SUBSCRIPTION_REQUIRED',
        message: t('errors.subscription.required'),
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  /**
   * Called right after Paddle's `checkout.completed`. With an API key the
   * transaction is re-fetched from Paddle (the client is never trusted); in
   * sandbox without a key we accept the client snapshot so the whole flow stays
   * testable locally. Production without a key refuses.
   */
  async syncFromCheckout(userId: string, dto: SyncSubscriptionDto): Promise<EntitlementDto> {
    if (this.api.isConfigured) {
      await this.syncFromPaddle(userId, dto);
    } else if (paddleConfig().environment === 'sandbox') {
      this.logger.warn(
        'PADDLE_API_KEY missing — activating subscription from the client checkout snapshot (sandbox only, do not ship)',
      );
      await this.repository.upsertForUser(userId, this.writeFromClientSnapshot(dto));
    } else {
      throw new ServiceUnavailableException(t('errors.subscription.notConfigured'));
    }
    return this.getEntitlement(userId);
  }

  /** Schedule cancellation at period end — access continues until then. */
  async cancel(userId: string): Promise<EntitlementDto> {
    const sub = await this.requireLiveSubscription(userId);
    if (!sub.cancelAtPeriodEnd) {
      await this.applyScheduledChange(sub, (id) => this.api.cancelAtPeriodEnd(id), {
        cancelAtPeriodEnd: true,
      });
    }
    return this.getEntitlement(userId);
  }

  /** Undo a scheduled cancellation — the subscription keeps renewing. */
  async resume(userId: string): Promise<EntitlementDto> {
    const sub = await this.requireLiveSubscription(userId);
    if (sub.cancelAtPeriodEnd) {
      await this.applyScheduledChange(sub, (id) => this.api.removeScheduledChange(id), {
        cancelAtPeriodEnd: false,
      });
    }
    return this.getEntitlement(userId);
  }

  /**
   * Applies a verified webhook event. Only `subscription.*` events matter — they
   * carry the full subscription entity, which is everything we track. Unknown
   * users / stale events are logged and swallowed (retrying wouldn't help);
   * genuine failures (DB down) propagate so Paddle retries.
   */
  async handleWebhook(event: { event_type?: string; data?: unknown } | undefined): Promise<void> {
    const type = event?.event_type ?? '';
    if (!type.startsWith('subscription.')) return;
    const entity = event?.data as PaddleSubscriptionEntity | undefined;
    if (!entity?.id) return;

    const write = this.writeFromEntity(entity);
    const existing = await this.repository.findByPaddleId(entity.id);
    if (existing) {
      await this.repository.update(existing.id, write);
      return;
    }

    const userId = typeof entity.custom_data?.userId === 'string' ? entity.custom_data.userId : null;
    if (!userId) {
      this.logger.warn(`Webhook ${type} for ${entity.id} has no custom_data.userId — ignored`);
      return;
    }
    const current = await this.repository.findByUserId(userId);
    // A canceled event for a subscription we no longer track must not clobber
    // the user's newer subscription (cancel-then-resubscribe races).
    if (
      current?.paddleSubscriptionId &&
      current.paddleSubscriptionId !== entity.id &&
      write.status === SubscriptionStatus.CANCELED
    ) {
      return;
    }
    try {
      await this.repository.upsertForUser(userId, write);
    } catch (error) {
      // Most likely an unknown userId (FK) from another environment sharing the
      // same Paddle sandbox — not retryable, so log instead of failing the hook.
      this.logger.warn(`Webhook ${type} for ${entity.id} could not be stored: ${(error as Error).message}`);
    }
  }

  // ─── internals ────────────────────────────────────────────────────────────────

  /**
   * The stored subscription, lazily re-fetched from Paddle when its paid-for
   * period has lapsed (covers renewals/cancellations in environments without a
   * public webhook URL — e.g. local dev). Failures keep the local row.
   */
  private async freshSubscription(userId: string): Promise<Subscription | null> {
    const sub = await this.repository.findByUserId(userId);
    if (!sub || !this.isStale(sub) || !sub.paddleSubscriptionId || !this.api.isConfigured) {
      return sub;
    }
    try {
      const entity = await this.api.getSubscription(sub.paddleSubscriptionId);
      return await this.repository.update(sub.id, this.writeFromEntity(entity));
    } catch {
      return sub; // Paddle unreachable — keep local state, next call retries
    }
  }

  private isStale(sub: Subscription): boolean {
    return (
      ENTITLED_STATUSES.includes(sub.status) &&
      !!sub.currentPeriodEnd &&
      sub.currentPeriodEnd.getTime() <= Date.now()
    );
  }

  private isEntitled(sub: Subscription | null): boolean {
    if (!sub || !ENTITLED_STATUSES.includes(sub.status)) return false;
    if (!sub.currentPeriodEnd) return true; // no period known yet — trust the status
    if (sub.currentPeriodEnd.getTime() > Date.now()) return true;
    // Period lapsed and the refresh didn't move it (no API key / Paddle down):
    // an auto-renewing subscription is presumed renewed; a scheduled cancel ended.
    return !sub.cancelAtPeriodEnd;
  }

  private toEntitlement(sub: Subscription | null, used: number): EntitlementDto {
    const entitled = this.isEntitled(sub);
    let status: EntitlementStatus = sub
      ? (sub.status.toLowerCase() as EntitlementStatus)
      : 'none';
    // A lapsed trial/active row that no longer entitles is presented as canceled
    // so the UI never claims an "active" subscription without access.
    if (sub && !entitled && ENTITLED_STATUSES.includes(sub.status)) status = 'canceled';
    return {
      entitled,
      status,
      plan: planForPrice(sub?.priceId),
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      trialEndsAt: sub?.status === SubscriptionStatus.TRIALING ? (sub.trialEndsAt?.toISOString() ?? null) : null,
      freeMessagesUsed: Math.min(used, FREE_MESSAGE_LIMIT),
      freeMessagesLimit: FREE_MESSAGE_LIMIT,
    };
  }

  /** Verified sync: re-fetch the transaction, check it belongs to this user. */
  private async syncFromPaddle(userId: string, dto: SyncSubscriptionDto): Promise<void> {
    if (!dto.transactionId) throw new BadRequestException(t('errors.subscription.syncFailed'));
    let tx;
    try {
      tx = await this.api.getTransaction(dto.transactionId);
    } catch (error) {
      if (error instanceof PaddleApiError && error.status < 500) {
        throw new NotFoundException(t('errors.subscription.syncFailed'));
      }
      throw new ServiceUnavailableException(t('errors.subscription.syncFailed'));
    }
    // The checkout was opened with customData.userId — a transaction id can't
    // activate Pro for anyone but the account that paid.
    const txUser = typeof tx.custom_data?.userId === 'string' ? tx.custom_data.userId : null;
    if (txUser !== userId) throw new ForbiddenException(t('errors.subscription.checkoutMismatch'));

    if (tx.subscription_id) {
      try {
        const entity = await this.api.getSubscription(tx.subscription_id);
        await this.repository.upsertForUser(userId, this.writeFromEntity(entity));
        return;
      } catch {
        // fall through to the transaction-derived provisional row
      }
    }
    // The subscription entity isn't readable yet (created asynchronously right
    // after checkout) — store a provisional row; webhooks / the lazy refresh
    // make it authoritative.
    const price = tx.items?.[0]?.price;
    const trial = Boolean(price?.trial_period);
    await this.repository.upsertForUser(userId, {
      paddleSubscriptionId: tx.subscription_id ?? null,
      paddleCustomerId: tx.customer_id ?? null,
      priceId: price?.id ?? '',
      status: trial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      currentPeriodEnd: tx.billing_period?.ends_at ? new Date(tx.billing_period.ends_at) : null,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
    });
  }

  /** Sandbox-only trust of the client checkout snapshot (no API key present). */
  private writeFromClientSnapshot(dto: SyncSubscriptionDto): SubscriptionWrite {
    const plan = planForPrice(dto.priceId);
    if (!plan) throw new BadRequestException(t('errors.subscription.syncFailed'));
    const { trialDays } = PLAN_DISPLAY[plan];
    const periodDays = trialDays > 0 ? trialDays : FALLBACK_PERIOD_DAYS[plan];
    const end = new Date(Date.now() + periodDays * DAY_MS);
    return {
      paddleSubscriptionId: null,
      paddleCustomerId: dto.customerId ?? null,
      priceId: dto.priceId!,
      status: trialDays > 0 ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      trialEndsAt: trialDays > 0 ? end : null,
    };
  }

  private async requireLiveSubscription(userId: string): Promise<Subscription> {
    const sub = await this.repository.findByUserId(userId);
    if (!sub || !ENTITLED_STATUSES.includes(sub.status)) {
      throw new NotFoundException(t('errors.subscription.none'));
    }
    return sub;
  }

  /**
   * Runs a scheduled-change call against Paddle and stores the result. Without
   * an API key the change is simulated locally in sandbox (keeps the profile
   * flow testable) and refused in production.
   */
  private async applyScheduledChange(
    sub: Subscription,
    call: (paddleId: string) => Promise<PaddleSubscriptionEntity>,
    fallback: Partial<SubscriptionWrite>,
  ): Promise<void> {
    if (sub.paddleSubscriptionId && this.api.isConfigured) {
      try {
        const entity = await call(sub.paddleSubscriptionId);
        await this.repository.update(sub.id, this.writeFromEntity(entity));
      } catch (error) {
        if (error instanceof PaddleApiError && error.status < 500) {
          throw new BadRequestException(t('errors.subscription.actionFailed'));
        }
        throw new ServiceUnavailableException(t('errors.subscription.actionFailed'));
      }
    } else if (paddleConfig().environment === 'sandbox') {
      this.logger.warn('PADDLE_API_KEY missing — applying scheduled change locally (sandbox only)');
      await this.repository.update(sub.id, fallback);
    } else {
      throw new ServiceUnavailableException(t('errors.subscription.notConfigured'));
    }
  }

  /** Our row shape from a Paddle subscription entity (API fetch or webhook). */
  private writeFromEntity(e: PaddleSubscriptionEntity): SubscriptionWrite {
    const status = STATUS_FROM_PADDLE[e.status] ?? SubscriptionStatus.CANCELED;
    const periodEnd = e.current_billing_period?.ends_at ?? e.next_billed_at;
    return {
      paddleSubscriptionId: e.id,
      paddleCustomerId: e.customer_id ?? null,
      priceId: e.items?.[0]?.price?.id ?? '',
      status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd) : null,
      cancelAtPeriodEnd: e.scheduled_change?.action === 'cancel',
      // During a trial the next bill is when the trial converts.
      trialEndsAt:
        status === SubscriptionStatus.TRIALING && e.next_billed_at ? new Date(e.next_billed_at) : null,
    };
  }
}
