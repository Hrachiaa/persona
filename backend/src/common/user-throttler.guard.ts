import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard keyed by the authenticated user id instead of the client IP.
 * For endpoints whose cost is per-account (LLM calls: chat messages, queue
 * resets) this stops one account from spinning the model across many IPs, and
 * keeps users behind a shared NAT from eating each other's budget.
 *
 * Apply at the ROUTE level together with a route @Throttle(...) override; the
 * controller-level JwtAuthGuard has already run by then, so req.user is set
 * (falls back to IP if it ever runs unauthenticated). The global IP-keyed
 * ThrottlerGuard still applies on top — the two keep separate counters.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ?? req.ip;
  }
}
