import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiCheck } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { ProBadge } from '../components/ProPlans';
import LangToggle from '../components/LangToggle';

/* ------------------------------------------------------------------ */
/* The standalone pricing page at /pricing. Paddle's merchant          */
/* verification asks for a pricing URL it can open anonymously, and    */
/* wants the billing frequency, currency and cancellation terms        */
/* stated in plain sight — hence the "how billing works" block.        */
/*                                                                     */
/* Copy comes from the same `landing:pricing.*` keys as the landing's  */
/* pricing section, so the two can't quote different prices. Purchase  */
/* still happens inside the app (Paddle.js overlay), so both CTAs lead */
/* to sign-up rather than a checkout.                                  */
/* ------------------------------------------------------------------ */

const FREE_TINTS = ['#F0E68C80', '#FDBA7480', '#FBCFE8', '#BEF26480', '#93C5FD80'];

function PlanRow({ name, sub, subTint, price, per }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{name}</span>
        <span className={`mt-0.5 block text-xs ${subTint}`}>{sub}</span>
      </span>
      <span className="tabular shrink-0 font-display text-2xl font-semibold">
        {price}
        <span className="font-sans text-xs font-normal text-white/55">/{per}</span>
      </span>
    </div>
  );
}

export default function Pricing() {
  const { t } = useTranslation('landing');
  const { t: tSub } = useTranslation('subscription');
  const { t: tLegal } = useTranslation('legal');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const previous = document.title;
    document.title = `${t('pricing.page.title')} · Persona`;
    return () => {
      document.title = previous;
    };
  }, [t]);

  const start = () => navigate(user ? '/portrait' : '/register');
  const billing = t('pricing.page.billing', { returnObjects: true });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-dvh"
    >
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <Link to="/welcome" className="btn-ghost -ml-2 inline-flex items-center gap-2 text-sm">
            <HiArrowLeft className="h-4 w-4" aria-hidden="true" />
            {tLegal('home')}
          </Link>
          <LangToggle />
        </div>

        <header className="mt-8">
          <p className="flex items-center gap-2 text-lg font-medium tracking-tight text-persona-dark">
            <span className="font-display text-xl">λ</span> Persona
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-persona-dark sm:text-4xl">
            {t('pricing.page.title')}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-persona-dark/80">
            {t('pricing.page.subtitle')}
          </p>
        </header>

        <div className="mt-10 grid items-stretch gap-5 md:grid-cols-2">
          {/* Free */}
          <div className="flex h-full flex-col rounded-4xl bg-persona-card p-7 shadow-warm">
            <h2 className="font-display text-2xl font-semibold text-persona-dark">
              {t('pricing.free.name')}
            </h2>
            <p className="tabular mt-2 font-display text-5xl font-semibold text-persona-dark">
              {t('pricing.free.price')}
            </p>
            <ul className="mt-7 space-y-3">
              {['f1', 'f2', 'f3', 'f4', 'f5'].map((k, i) => (
                <li key={k} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: FREE_TINTS[i] }}
                  >
                    <HiCheck className="h-3.5 w-3.5 text-persona-dark" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-persona-dark">{t(`pricing.free.${k}`)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <button type="button" onClick={start} className="btn-secondary w-full">
                {t('pricing.free.cta')}
              </button>
            </div>
          </div>

          {/* Pro */}
          <div className="relative flex h-full flex-col overflow-hidden rounded-4xl bg-persona-dark p-7 text-white shadow-warm-lg">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-persona-accent-lavender/25 blur-2xl"
            />
            <ProBadge onDark className="self-start" />
            <p className="mt-5 text-[15px] leading-relaxed text-white/85">{t('pricing.pro.desc')}</p>
            <div className="mt-6 space-y-3">
              <PlanRow
                name={tSub('plans.weekly')}
                sub={t('pricing.pro.weeklySub')}
                subTint="text-persona-accent-lime"
                price={t('pricing.pro.weeklyPrice')}
                per={t('pricing.pro.weeklyPer')}
              />
              <PlanRow
                name={tSub('plans.monthly')}
                sub={t('pricing.pro.monthlySub')}
                subTint="text-persona-accent-lavender"
                price={t('pricing.pro.monthlyPrice')}
                per={t('pricing.pro.monthlyPer')}
              />
            </div>
            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={start}
                className="w-full transform rounded-full bg-white py-3.5 font-medium text-persona-dark transition-all duration-300 ease-out hover:shadow-warm-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-dark"
              >
                {t('pricing.pro.cta')}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/45">
                {t('pricing.pro.note')}
              </p>
            </div>
          </div>
        </div>

        {/* The part Paddle actually reads: frequency, currency, renewal, exit. */}
        <section className="mt-14 border-t border-persona-line pt-10">
          <h2 className="font-display text-xl font-semibold tracking-tight text-persona-dark sm:text-2xl">
            {t('pricing.page.billingTitle')}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {Array.isArray(billing) &&
              billing.map((item, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-persona-dark/80">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-persona-dark/30"
                  />
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </section>

        <footer className="mt-12 border-t border-persona-line pt-8">
          <p className="text-[13px] leading-relaxed text-persona-muted">
            <Trans
              t={tSub}
              i18nKey="legalNote"
              components={{
                terms: <Link to="/terms" className="underline underline-offset-2 hover:text-persona-dark" />,
                refunds: <Link to="/refunds" className="underline underline-offset-2 hover:text-persona-dark" />,
              }}
            />
          </p>
          <nav className="mt-3 flex flex-wrap gap-1" aria-label={tLegal('alsoRead')}>
            <Link to="/terms" className="btn-ghost text-sm">
              {tLegal('docs.terms')}
            </Link>
            <Link to="/privacy" className="btn-ghost text-sm">
              {tLegal('docs.privacy')}
            </Link>
            <Link to="/refunds" className="btn-ghost text-sm">
              {tLegal('docs.refunds')}
            </Link>
          </nav>
          <p className="mt-6 text-xs text-persona-muted">
            {tLegal('operator.name')} · {tLegal('operator.form')} · {tLegal('operator.email')}
          </p>
        </footer>
      </div>
    </motion.div>
  );
}
