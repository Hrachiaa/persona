import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineCheckCircle, HiOutlineLockClosed } from 'react-icons/hi2';
import { getProConfig } from '../utils/paddle';
import { formatPlanPrice, periodShort, useProCheckout } from '../utils/proCheckout';
import { writeResource } from '../utils/resourceCache';
import { SUBSCRIPTION_KEY } from '../utils/resourceKeys';
import { showToast } from './Toast';
import { PlanPicker, ProBadge, ProBenefits } from './ProPlans';

/**
 * The Persona Pro paywall. Raised by the chat when the third message is
 * rejected (402): the message has already been rolled back into the input, and
 * `onSubscribed(entitlement)` fires once the purchase is confirmed so the chat
 * can send it again by itself. Render inside <AnimatePresence>.
 */
export default function PaywallModal({ user, onClose, onSubscribed }) {
  const { t } = useTranslation('subscription');
  const [config, setConfig] = useState(null);
  const [plan, setPlan] = useState('weekly'); // the trial plan is the hook — preselect it
  const entitlementRef = useRef(null);

  const { phase, start, retrySync } = useProCheckout({
    user,
    onConfirmed: (entitlement) => {
      entitlementRef.current = entitlement;
      // The profile's cached entitlement is now stale — it must show Pro
      // without waiting for its next background refresh.
      writeResource(SUBSCRIPTION_KEY, entitlement);
    },
    onError: () => showToast(t('errors.checkout')),
  });

  useEffect(() => {
    let active = true;
    getProConfig()
      .then((cfg) => active && setConfig(cfg))
      .catch(() => {
        if (!active) return;
        showToast(t('errors.config'));
        onClose?.();
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Linger on the success state for a beat, then hand control back to the chat.
  useEffect(() => {
    if (phase !== 'success') return;
    const timer = setTimeout(() => onSubscribed?.(entitlementRef.current), 1600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Dismissing cancels the held message — only allowed while nothing is in flight.
  const canDismiss = phase === 'idle' || phase === 'syncError';
  const dismiss = () => canDismiss && onClose?.();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && dismiss();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const busy = phase === 'opening' || phase === 'checkout' || phase === 'confirming';
  const selected = config?.prices?.[plan];
  const ctaLabel =
    phase === 'opening' || phase === 'checkout'
      ? t('cta.opening')
      : plan === 'weekly' && selected?.trialDays > 0
        ? t('cta.trial', { days: selected.trialDays })
        : t('cta.subscribe', { price: formatPlanPrice(selected), period: periodShort(t, selected) });

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-persona-dark/40 backdrop-blur-[2px]" onClick={dismiss} />

      {/* Card */}
      <motion.div
        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-persona-bg rounded-t-4xl sm:rounded-4xl shadow-warm-lg overflow-x-hidden"
        initial={{ y: 64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 64, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        {/* Soft aurora — the pastel accents, blurred into the background */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-persona-accent-lavender/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -left-20 w-64 h-64 rounded-full bg-persona-accent-peach/40 blur-3xl" />

        {canDismiss && (
          <button
            onClick={dismiss}
            aria-label={t('common:close')}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 shadow-warm flex items-center justify-center text-persona-dark hover:shadow-warm-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        )}

        <div className="relative px-6 pt-8 pb-7 sm:px-8">
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-10"
              >
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
                  className="w-20 h-20 rounded-3xl bg-persona-accent-lime/50 flex items-center justify-center mx-auto mb-6"
                >
                  <HiOutlineCheckCircle className="w-10 h-10 text-persona-dark" />
                </motion.div>
                <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">
                  {t('success.title')}
                </h2>
                <p className="text-sm text-persona-muted">{t('success.chat')}</p>
              </motion.div>
            ) : phase === 'syncError' ? (
              <motion.div
                key="syncError"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-3xl bg-persona-accent-yellow/50 flex items-center justify-center mx-auto mb-5">
                  <HiOutlineLockClosed className="w-8 h-8 text-persona-dark" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">
                  {t('syncError.title')}
                </h2>
                <p className="text-sm text-persona-muted leading-relaxed mb-6">{t('syncError.body')}</p>
                <button onClick={retrySync} className="btn-primary w-full">
                  {t('syncError.retry')}
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProBadge />
                <h2
                  id="paywall-title"
                  className="font-display text-[27px] leading-[1.15] font-semibold text-persona-dark mt-4 pr-8"
                >
                  {t('paywall.title')}
                </h2>
                <p className="text-sm text-persona-muted leading-relaxed mt-2">
                  {t('paywall.subtitle')}
                </p>

                <ProBenefits className="mt-5" />

                {config ? (
                  <PlanPicker
                    className="mt-6"
                    prices={config.prices}
                    value={plan}
                    onChange={setPlan}
                    disabled={busy}
                  />
                ) : (
                  // config still loading — same footprint, soft pulse
                  <div className="mt-6 space-y-2.5" aria-hidden="true">
                    <div className="h-[74px] rounded-2xl bg-white/70 animate-pulse-soft" />
                    <div className="h-[74px] rounded-2xl bg-white/70 animate-pulse-soft" />
                  </div>
                )}

                <button
                  onClick={() => start(plan)}
                  disabled={!config || busy}
                  className="btn-primary w-full text-center mt-5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {(busy || !config) && (
                      <span
                        aria-hidden="true"
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                      />
                    )}
                    {phase === 'confirming' ? t('cta.confirming') : ctaLabel}
                  </span>
                </button>

                <p className="text-xs text-persona-muted text-center leading-relaxed mt-3">
                  {t('paywall.messageSaved')}
                </p>
                <p className="text-[11px] text-persona-muted/80 text-center mt-2">{t('finePrint')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
