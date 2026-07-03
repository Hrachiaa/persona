import { Injectable, Logger } from '@nestjs/common';
import { paddleConfig } from './paddle.config';

// The subset of Paddle Billing entities we read. Field names are Paddle's
// (snake_case) — these mirror the REST API, not our Prisma model.
export interface PaddleSubscriptionEntity {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | string;
  customer_id: string | null;
  custom_data: Record<string, unknown> | null;
  next_billed_at: string | null;
  current_billing_period: { starts_at: string; ends_at: string } | null;
  scheduled_change: { action: 'cancel' | 'pause' | 'resume'; effective_at: string } | null;
  items: { price?: { id?: string } }[];
}

export interface PaddleTransactionEntity {
  id: string;
  status: string;
  customer_id: string | null;
  subscription_id: string | null;
  custom_data: Record<string, unknown> | null;
  billing_period: { starts_at: string; ends_at: string } | null;
  items: { price?: { id?: string; trial_period?: unknown | null } }[];
  details?: { totals?: { grand_total?: string } };
}

export class PaddleApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(`Paddle API ${status} (${code}): ${detail}`);
  }
}

/**
 * Minimal Paddle Billing REST client (fetch + Bearer key — the four calls we
 * need don't justify the official SDK). All methods throw PaddleApiError on a
 * non-2xx response; callers decide what is fatal. Unusable without
 * PADDLE_API_KEY — check `isConfigured` first.
 */
@Injectable()
export class PaddleApiClient {
  private readonly logger = new Logger(PaddleApiClient.name);

  get isConfigured(): boolean {
    return Boolean(paddleConfig().apiKey);
  }

  getTransaction(id: string): Promise<PaddleTransactionEntity> {
    return this.request('GET', `/transactions/${encodeURIComponent(id)}`);
  }

  getSubscription(id: string): Promise<PaddleSubscriptionEntity> {
    return this.request('GET', `/subscriptions/${encodeURIComponent(id)}`);
  }

  /** Schedule cancellation at the end of the paid-for period (Paddle default). */
  cancelAtPeriodEnd(id: string): Promise<PaddleSubscriptionEntity> {
    return this.request('POST', `/subscriptions/${encodeURIComponent(id)}/cancel`, {
      effective_from: 'next_billing_period',
    });
  }

  /** Undo a scheduled cancellation — the subscription keeps renewing. */
  removeScheduledChange(id: string): Promise<PaddleSubscriptionEntity> {
    return this.request('PATCH', `/subscriptions/${encodeURIComponent(id)}`, {
      scheduled_change: null,
    });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { apiBaseUrl, apiKey } = paddleConfig();
    const res = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const payload = (await res.json().catch(() => ({}))) as {
      data?: T;
      error?: { code?: string; detail?: string };
    };
    if (!res.ok || payload.data === undefined) {
      const code = payload.error?.code ?? 'unknown';
      const detail = payload.error?.detail ?? 'no error detail';
      this.logger.warn(`Paddle ${method} ${path} failed: ${res.status} ${code} — ${detail}`);
      throw new PaddleApiError(res.status, code, detail);
    }
    return payload.data;
  }
}
