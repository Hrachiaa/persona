import client from './client';

// Persona Pro (Paddle Billing). `config` is the Paddle.js bootstrap (env, client
// token, the two plans); `me` is the entitlement + free-message meter; `sync`
// confirms a finished checkout server-side (called on Paddle's
// checkout.completed); cancel/resume manage the scheduled cancellation.
export const subscriptionsApi = {
  // GET /subscriptions/config -> { environment, clientToken, freeMessagesLimit, prices: { weekly, monthly } }
  config: () => client.get('/subscriptions/config').then((r) => r.data),

  // GET /subscriptions/me -> { entitled, status, plan, currentPeriodEnd, cancelAtPeriodEnd,
  //                            trialEndsAt, freeMessagesUsed, freeMessagesLimit }
  me: () => client.get('/subscriptions/me').then((r) => r.data),

  // POST /subscriptions/sync { transactionId, priceId?, customerId? } -> entitlement
  sync: (payload) => client.post('/subscriptions/sync', payload).then((r) => r.data),

  // POST /subscriptions/cancel -> entitlement (access stays until period end)
  cancel: () => client.post('/subscriptions/cancel', {}).then((r) => r.data),

  // POST /subscriptions/resume -> entitlement (undo a scheduled cancellation)
  resume: () => client.post('/subscriptions/resume', {}).then((r) => r.data),
};
