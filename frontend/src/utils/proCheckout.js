import { useRef, useState } from 'react';
import i18n from '../i18n';
import { subscriptionsApi } from '../api/subscriptions';
import { openProCheckout, closeProCheckout } from './paddle';
import posthog from 'posthog-js';

// Non-component Pro helpers, shared by the chat paywall and the profile screen
// (kept out of ProPlans.jsx so that file only exports components — fast refresh).

/** "$5" — display only; the amount actually charged is the Paddle price. */
export function formatPlanPrice(plan) {
  if (!plan) return '';
  return plan.currency === 'USD' ? `$${plan.amount}` : `${plan.amount} ${plan.currency}`;
}

export function periodShort(t, plan) {
  return plan?.interval === 'month' ? t('plans.perMonthShort') : t('plans.perWeekShort');
}

/**
 * Checkout orchestration shared by the paywall and the profile screen:
 * opens the Paddle overlay, then confirms the purchase with the backend.
 *
 * phase: 'idle' → 'opening' → 'checkout' → 'confirming' → 'success' | 'syncError'
 * (abandoning the overlay returns to 'idle'). `onConfirmed(entitlement)` fires
 * once the backend has acknowledged the subscription.
 */
export function useProCheckout({ user, onConfirmed, onError }) {
  const [phase, setPhase] = useState('idle');
  const lastCheckoutRef = useRef(null); // checkout.completed data, for sync retries

  const sync = async (data) => {
    setPhase('confirming');
    try {
      const entitlement = await subscriptionsApi.sync({
        transactionId: data?.transaction_id,
        priceId: data?.items?.[0]?.price_id,
        customerId: data?.customer?.id,
      });
      setPhase('success');
      posthog.capture('subscription_confirmed', { plan: data?.items?.[0]?.price?.billing_cycle?.interval });
      onConfirmed?.(entitlement);
    } catch {
      setPhase('syncError');
    }
  };

  const start = async (plan) => {
    setPhase('opening');
    posthog.capture('subscription_checkout_started', { plan });
    try {
      await openProCheckout({
        plan,
        user,
        locale: i18n.language,
        onCompleted: (data) => {
          lastCheckoutRef.current = data;
          // Hand back to our UI immediately — our own success state is the finale.
          closeProCheckout();
          sync(data);
        },
        // Abandoned overlay → back to picking. The functional update keeps
        // confirming/success intact (checkout.closed also fires after completion).
        onClosed: () => setPhase((p) => (p === 'opening' || p === 'checkout' ? 'idle' : p)),
      });
      setPhase('checkout');
    } catch {
      setPhase('idle');
      onError?.();
    }
  };

  const retrySync = () => {
    if (lastCheckoutRef.current) sync(lastCheckoutRef.current);
  };

  return { phase, start, retrySync };
}
