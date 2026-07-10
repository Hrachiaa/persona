import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineSparkles,
  HiOutlineHandThumbUp,
} from 'react-icons/hi2';
import { formatPlanPrice, periodShort } from '../utils/proCheckout';

// Shared Persona Pro pieces — used by the chat paywall (PaywallModal) and the
// profile's subscription screen, so the plans always look and behave the same.
// Components only (fast refresh); the checkout hook lives in utils/proCheckout.js.

/** The "✦ Persona Pro" chip — dark pill on light surfaces, glassy on dark ones. */
export function ProBadge({ onDark = false, className = '' }) {
  const { t } = useTranslation('subscription');
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold tracking-[0.14em] uppercase px-3 py-1.5 ${
        onDark ? 'bg-white/10 text-white border border-white/15' : 'bg-persona-dark text-white'
      } ${className}`}
    >
      <HiOutlineSparkles className="w-3.5 h-3.5 text-persona-accent-yellow" aria-hidden="true" />
      {t('badge')}
    </span>
  );
}

const BENEFITS = [
  { icon: HiOutlineChatBubbleLeftRight, key: 'benefits.unlimited', tint: 'bg-persona-accent-peach/50' },
  { icon: HiOutlineSparkles, key: 'benefits.insight', tint: 'bg-persona-accent-lavender/50' },
  { icon: HiOutlineHandThumbUp, key: 'benefits.cancel', tint: 'bg-persona-accent-lime/50' },
];

export function ProBenefits({ onDark = false, className = '' }) {
  const { t } = useTranslation('subscription');
  return (
    <ul className={`space-y-2.5 ${className}`}>
      {BENEFITS.map(({ icon: Icon, key, tint }) => (
        <li key={key} className="flex items-center gap-3">
          <span
            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
              onDark ? 'bg-white/10 text-white' : `${tint} text-persona-dark`
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className={`text-sm leading-snug ${onDark ? 'text-white/85' : 'text-persona-dark'}`}>
            {t(key)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlanCard({ plan, config, selected, disabled, onSelect }) {
  const { t } = useTranslation('subscription');
  if (!config) return null;
  const isWeekly = plan === 'weekly';
  const price = formatPlanPrice(config);
  const per = periodShort(t, config);

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`w-full flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${
        selected
          ? 'border-persona-dark bg-white shadow-warm'
          : 'border-persona-line/80 bg-white/70 hover:border-persona-dark/25'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      {/* radio dot */}
      <span
        aria-hidden="true"
        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected ? 'border-persona-dark' : 'border-persona-line'
        }`}
      >
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-persona-dark" />}
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-persona-dark text-sm">
            {t(isWeekly ? 'plans.weekly' : 'plans.monthly')}
          </span>
          {isWeekly && config.trialDays > 0 ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-persona-accent-lime/70 text-persona-dark rounded-full px-2 py-0.5">
              {t('plans.trialBadge', { days: config.trialDays })}
            </span>
          ) : !isWeekly ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-persona-accent-lavender/60 text-persona-dark rounded-full px-2 py-0.5">
              {t('plans.saveBadge')}
            </span>
          ) : null}
        </span>
        <span className="block text-xs text-persona-muted mt-1">
          {isWeekly && config.trialDays > 0
            ? t('plans.weeklyNote', { price, period: per })
            : t('plans.monthlyNote')}
        </span>
      </span>

      <span className="shrink-0 font-display text-xl font-semibold text-persona-dark tabular">
        {price}
        <span className="font-sans text-xs font-normal text-persona-muted">/{per}</span>
      </span>
    </motion.button>
  );
}

/** The two-plan radio group. `prices` is `config.prices` from the backend. */
export function PlanPicker({ prices, value, onChange, disabled = false, className = '' }) {
  const { t } = useTranslation('subscription');
  return (
    <div role="radiogroup" aria-label={t('badge')} className={`space-y-2.5 ${className}`}>
      <PlanCard
        plan="weekly"
        config={prices?.weekly}
        selected={value === 'weekly'}
        disabled={disabled}
        onSelect={() => onChange('weekly')}
      />
      <PlanCard
        plan="monthly"
        config={prices?.monthly}
        selected={value === 'monthly'}
        disabled={disabled}
        onSelect={() => onChange('monthly')}
      />
    </div>
  );
}

