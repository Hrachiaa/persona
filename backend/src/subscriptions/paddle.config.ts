// Paddle Billing configuration, read from env on each use (ConfigModule loads
// .env.${NODE_ENV} into process.env at boot — same pattern as common/security.ts).
//
//   PADDLE_CLIENT_TOKEN   client-side token for Paddle.js (safe to expose)
//   PADDLE_API_KEY        server-side API key — verifies checkouts, cancels subs.
//                         Without it, sandbox falls back to trusting the client
//                         (see SubscriptionsService.syncFromCheckout).
//   PADDLE_WEBHOOK_SECRET signing secret of the webhook destination
//   PADDLE_PRICE_WEEKLY / PADDLE_PRICE_MONTHLY   the two pri_... ids
//   PADDLE_ENV            'sandbox' | 'production'; defaults from the token prefix
//                         (sandbox client tokens start with "test_").

export type PaddleEnvironment = 'sandbox' | 'production';
export type ProPlan = 'weekly' | 'monthly';

export interface PaddleConfig {
  environment: PaddleEnvironment;
  clientToken: string;
  apiKey: string | null;
  webhookSecret: string | null;
  apiBaseUrl: string;
  prices: Record<ProPlan, string>;
}

export function paddleConfig(): PaddleConfig {
  const clientToken = process.env.PADDLE_CLIENT_TOKEN || '';
  const environment: PaddleEnvironment =
    process.env.PADDLE_ENV === 'production' || process.env.PADDLE_ENV === 'sandbox'
      ? process.env.PADDLE_ENV
      : clientToken.startsWith('test_')
        ? 'sandbox'
        : 'production';
  return {
    environment,
    clientToken,
    apiKey: process.env.PADDLE_API_KEY || null,
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || null,
    apiBaseUrl: environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com',
    prices: {
      weekly: process.env.PADDLE_PRICE_WEEKLY || '',
      monthly: process.env.PADDLE_PRICE_MONTHLY || '',
    },
  };
}

/** The plan a Paddle price id belongs to, or null for an unknown price. */
export function planForPrice(priceId: string | null | undefined): ProPlan | null {
  if (!priceId) return null;
  const { prices } = paddleConfig();
  if (priceId === prices.weekly) return 'weekly';
  if (priceId === prices.monthly) return 'monthly';
  return null;
}
