import { initializePaddle } from '@paddle/paddle-js';
import { subscriptionsApi } from '../api/subscriptions';
import { registerSessionCache } from './sessionCaches';

// Paddle.js singleton. The script + config are loaded once per page (they're
// environment-level, not account-level); each checkout registers its own
// completed/closed handlers here — only one checkout can be open at a time.

let setupPromise = null; // Promise<{ paddle, config }>
let activeCheckout = null; // { onCompleted, onClosed } for the overlay in flight

// Paddle survives logout (it's account-agnostic), but a checkout mid-flight
// must not fire callbacks into an unmounted session.
registerSessionCache(() => {
  activeCheckout = null;
});

function setup() {
  if (!setupPromise) {
    setupPromise = (async () => {
      const config = await subscriptionsApi.config();
      const paddle = await initializePaddle({
        environment: config.environment,
        token: config.clientToken,
        eventCallback: (event) => {
          if (!activeCheckout) return;
          if (event.name === 'checkout.completed') {
            activeCheckout.onCompleted?.(event.data);
          } else if (event.name === 'checkout.closed') {
            const current = activeCheckout;
            activeCheckout = null;
            current.onClosed?.();
          }
        },
      });
      if (!paddle) throw new Error('Paddle failed to initialize');
      return { paddle, config };
    })().catch((err) => {
      setupPromise = null; // a failed load (offline, bad token) can be retried
      throw err;
    });
  }
  return setupPromise;
}

/** The plans/config the paywall renders (fetches + caches the Paddle bootstrap). */
export async function getProConfig() {
  return (await setup()).config;
}

/**
 * Opens the Paddle checkout overlay for a plan ('weekly' | 'monthly').
 * `onCompleted(data)` fires on successful payment with the checkout event data
 * (snake_case, e.g. data.transaction_id); `onClosed()` fires when the overlay
 * goes away — after completion or on user abandon.
 */
export async function openProCheckout({ plan, user, locale, onCompleted, onClosed }) {
  const { paddle, config } = await setup();
  const priceId = config.prices?.[plan]?.priceId;
  if (!priceId) throw new Error(`No Paddle price configured for plan "${plan}"`);
  activeCheckout = { onCompleted, onClosed };
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    // Prefill the account email; customData ties the transaction (and the
    // subscription Paddle spawns from it) back to this user for sync/webhooks.
    customer: user?.email ? { email: user.email } : undefined,
    customData: { userId: user?.id },
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      allowLogout: false, // the email is the account's — don't let it change mid-checkout
      showAddDiscounts: false,
      ...(locale ? { locale } : {}),
    },
  });
}

/** Closes the Paddle overlay (used right after completion to hand back to our UI). */
export async function closeProCheckout() {
  if (!setupPromise) return;
  try {
    const { paddle } = await setupPromise;
    paddle.Checkout.close();
  } catch {
    /* overlay already gone */
  }
}
