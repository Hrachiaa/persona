import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { subscriptionsApi } from '../api/subscriptions';
import { getProConfig } from '../utils/paddle';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../components/Toast';
import { PlanPicker, ProBadge, ProBenefits } from '../components/ProPlans';
import { formatPlanPrice, periodShort, useProCheckout } from '../utils/proCheckout';
import i18n from '../i18n';

// The Profile → Persona Pro screen. Free users get the pitch + plans (same
// checkout flow as the chat paywall); subscribers get their status and the
// cancel / resume controls. `sub` is the entitlement from /subscriptions/me,
// owned by Profile so the main list's status chip stays in sync via onChanged.

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
}

/** Aurora blobs for the dark hero cards. */
function Aurora() {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-persona-accent-lavender/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-persona-accent-peach/20 blur-3xl" />
    </>
  );
}

export default function SubscriptionView({ sub, error, onChanged }) {
  const { t } = useTranslation('subscription');

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
        {t('common:genericError')}
      </div>
    );
  }
  if (!sub) {
    return (
      <div className="space-y-3" aria-hidden="true">
        <div className="h-44 rounded-4xl bg-white/70 animate-pulse-soft" />
        <div className="h-[74px] rounded-2xl bg-white/70 animate-pulse-soft" />
        <div className="h-[74px] rounded-2xl bg-white/70 animate-pulse-soft" />
      </div>
    );
  }
  return sub.entitled ? (
    <ManageView sub={sub} onChanged={onChanged} />
  ) : (
    <UpgradeView onChanged={onChanged} />
  );
}

/* ------------------------------------------------------------- free / pitch */

/** Underlined inline link for the fine print under the checkout CTA. */
function LegalLink({ to, children }) {
  return (
    <Link to={to} className="underline underline-offset-2 hover:text-persona-dark">
      {children}
    </Link>
  );
}

function UpgradeView({ onChanged }) {
  const { t } = useTranslation('subscription');
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [plan, setPlan] = useState('weekly');

  const { phase, start, retrySync } = useProCheckout({
    user,
    onConfirmed: (entitlement) => onChanged(entitlement),
    onError: () => showToast(t('errors.checkout')),
  });

  useEffect(() => {
    let active = true;
    getProConfig()
      .then((cfg) => active && setConfig(cfg))
      .catch(() => active && showToast(t('errors.config')));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = phase === 'opening' || phase === 'checkout' || phase === 'confirming';
  const selected = config?.prices?.[plan];
  const ctaLabel =
    phase === 'opening' || phase === 'checkout'
      ? t('cta.opening')
      : phase === 'confirming'
        ? t('cta.confirming')
        : plan === 'weekly' && selected?.trialDays > 0
          ? t('cta.trial', { days: selected.trialDays })
          : t('cta.subscribe', { price: formatPlanPrice(selected), period: periodShort(t, selected) });

  return (
    <div>
      {/* Dark hero — the pitch */}
      <div className="relative overflow-hidden rounded-4xl bg-persona-dark text-white p-6 shadow-warm-lg">
        <Aurora />
        <div className="relative">
          <ProBadge onDark />
          <h2 className="font-display text-2xl font-semibold text-white mt-4">
            {t('profile.freeTitle')}
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mt-1.5 mb-5">
            {t('profile.freeSubtitle')}
          </p>
          <ProBenefits onDark />
        </div>
      </div>

      {/* Plans + CTA */}
      {phase === 'syncError' ? (
        <div className="mt-5 p-5 rounded-3xl bg-persona-accent-yellow/30 text-center">
          <p className="font-medium text-persona-dark mb-1">{t('syncError.title')}</p>
          <p className="text-sm text-persona-muted leading-relaxed mb-4">{t('syncError.body')}</p>
          <button onClick={retrySync} className="btn-primary w-full">
            {t('syncError.retry')}
          </button>
        </div>
      ) : (
        <>
          {config ? (
            <PlanPicker className="mt-5" prices={config.prices} value={plan} onChange={setPlan} disabled={busy} />
          ) : (
            <div className="mt-5 space-y-2.5" aria-hidden="true">
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
              {busy && (
                <span
                  aria-hidden="true"
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                />
              )}
              {ctaLabel}
            </span>
          </button>
          <p className="text-[11px] text-persona-muted/80 text-center mt-3">{t('finePrint')}</p>
          {/* Purchase terms at the point of sale — same line as the chat paywall. */}
          <p className="text-[11px] text-persona-muted/80 text-center mt-1.5 leading-relaxed">
            <Trans
              t={t}
              i18nKey="legalNote"
              components={{
                terms: <LegalLink to="/terms" />,
                refunds: <LegalLink to="/refunds" />,
              }}
            />
          </p>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- subscriber */

function statusPill(t, sub) {
  if (sub.status === 'past_due')
    return { label: t('profile.statusPastDue'), cls: 'bg-persona-accent-pink text-persona-dark' };
  if (sub.cancelAtPeriodEnd)
    return { label: t('profile.statusCancelling'), cls: 'bg-persona-accent-peach text-persona-dark' };
  if (sub.status === 'trialing')
    return { label: t('profile.statusTrial'), cls: 'bg-persona-accent-yellow text-persona-dark' };
  return { label: t('profile.statusActive'), cls: 'bg-persona-accent-lime text-persona-dark' };
}

function ManageView({ sub, onChanged }) {
  const { t } = useTranslation('subscription');
  const { t: tLegal } = useTranslation('legal');
  const [config, setConfig] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  // Only for the price line — cached after the first fetch, fine if it fails.
  useEffect(() => {
    let active = true;
    getProConfig().then((cfg) => active && setConfig(cfg)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const pill = statusPill(t, sub);
  const planCfg = sub.plan ? config?.prices?.[sub.plan] : null;
  // A scheduled cancellation trumps the trial line — "first charge on …" would
  // be a lie once nothing is going to be charged.
  const dateLine = sub.cancelAtPeriodEnd
    ? sub.currentPeriodEnd
      ? t('profile.endsOn', { date: fmtDate(sub.currentPeriodEnd) })
      : ''
    : sub.status === 'trialing' && (sub.trialEndsAt || sub.currentPeriodEnd)
      ? t('profile.trialUntil', { date: fmtDate(sub.trialEndsAt || sub.currentPeriodEnd) })
      : sub.currentPeriodEnd
        ? t('profile.renewsOn', { date: fmtDate(sub.currentPeriodEnd) })
        : '';

  const doCancel = async () => {
    setConfirmCancel(false);
    setBusy(true);
    try {
      const next = await subscriptionsApi.cancel();
      onChanged(next);
      showToast(t('profile.cancelled', { date: fmtDate(next.currentPeriodEnd) }));
    } catch {
      showToast(t('profile.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const doResume = async () => {
    setBusy(true);
    try {
      const next = await subscriptionsApi.resume();
      onChanged(next);
      showToast(t('profile.resumed'));
    } catch {
      showToast(t('profile.actionError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Status card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-4xl bg-persona-dark text-white p-6 shadow-warm-lg"
      >
        <Aurora />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <ProBadge onDark />
            <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${pill.cls}`}>
              {pill.label}
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-white mt-4">
            {sub.plan === 'monthly' ? t('profile.planMonthly') : t('profile.planWeekly')}
            {planCfg && (
              <span className="font-sans text-base font-normal text-white/60 ml-2 tabular">
                {formatPlanPrice(planCfg)}/{periodShort(t, planCfg)}
              </span>
            )}
          </h2>
          {dateLine && <p className="text-sm text-white/70 mt-1.5">{dateLine}</p>}
          {sub.status === 'past_due' && (
            <p className="text-xs text-persona-accent-pink mt-3 leading-relaxed">
              {t('profile.pastDueNote')}
            </p>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="mt-5 space-y-3">
        {sub.cancelAtPeriodEnd ? (
          <button onClick={doResume} disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {t('profile.resumeBtn')}
          </button>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={busy}
            className="w-full py-3.5 rounded-full bg-white shadow-warm text-persona-danger font-medium hover:shadow-warm-lg transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
          >
            {t('profile.cancelBtn')}
          </button>
        )}
        <p className="text-[11px] text-persona-muted/80 text-center">{t('profile.paddleNote')}</p>
        {/* The billing screen is where people look for the purchase terms. */}
        <nav
          aria-label={tLegal('alsoRead')}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-persona-muted/80"
        >
          <Link to="/terms" className="underline underline-offset-2 hover:text-persona-dark">
            {tLegal('docs.terms')}
          </Link>
          <Link to="/refunds" className="underline underline-offset-2 hover:text-persona-dark">
            {tLegal('docs.refunds')}
          </Link>
          <Link to="/privacy" className="underline underline-offset-2 hover:text-persona-dark">
            {tLegal('docs.privacy')}
          </Link>
        </nav>
      </div>

      <AnimatePresence>
        {confirmCancel && (
          <ConfirmDialog
            title={t('profile.cancelTitle')}
            body={t('profile.cancelBody', { date: fmtDate(sub.currentPeriodEnd) })}
            confirmLabel={t('profile.cancelConfirm')}
            cancelLabel={t('common:back')}
            onCancel={() => setConfirmCancel(false)}
            onConfirm={doCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
