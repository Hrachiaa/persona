import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import ScaleBar from './ScaleBar';

const byScoreDesc = (a, b) => b.score - a.score;

// Schwartz PVQ-RR: 19 basic values (top) + 4 higher-order values (bottom),
// each sorted highest-first, on a centered scale whose half-width is the
// furthest score from 0 (so the longest bar reaches the edge, 0 stays centered).
export default function SchwartzResultScreen({ result, meta, onRetake, onViewPortrait, actions, ownerName }) {
  const { t } = useTranslation('results');
  const r = result?.result || {};
  const Icon = meta.icon;

  // Keep the value id (1–19 / 1–4) so the display name can be localized by id
  // (the stored result's `name` is English; the label comes from the i18n catalog).
  const values = Object.entries(r.values || {}).map(([id, v]) => ({ id, ...v })).sort(byScoreDesc);
  const higherOrder = Object.entries(r.higherOrderValues || {}).map(([id, v]) => ({ id, ...v })).sort(byScoreDesc);

  // Symmetric scale bound: the furthest result from 0 (in either direction)
  // defines the width, with ~5% headroom so the longest bar doesn't touch the
  // edge, while 0 stays centered.
  const bound =
    (Math.max(0, ...[...values, ...higherOrder].map((v) => Math.abs(v.score))) || 1) * 1.05;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-6 pt-8 pb-12"
    >
      {/* Hero */}
      <div className="text-center mb-6">
        <motion.div
          className={`w-20 h-20 ${meta.color} rounded-[1.75rem] flex items-center justify-center mx-auto mb-5`}
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <Icon className={`w-10 h-10 ${meta.iconColor}`} />
        </motion.div>
        <h2 className="font-display text-3xl font-semibold text-persona-dark mb-2">{ownerName ? t('schwartz.titleOwner', { name: ownerName }) : t('schwartz.titleSelf')}</h2>
        <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
          {ownerName ? t('schwartz.subtitleOwner', { name: ownerName }) : t('schwartz.subtitleSelf')}
        </p>
      </div>

      {/* Values */}
      <section className="surface-warm rounded-3xl p-5 sm:p-6">
        <header className="mb-4">
          <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">{t('schwartz.valuesHeading')}</h3>
          <p className="text-sm text-persona-muted mt-1">{t('schwartz.valuesSub')}</p>
        </header>
        <div className="divide-y divide-persona-line/60">
          {values.map((v, i) => (
            <ScaleBar key={v.id} label={t(`schwartz.valueNames.${v.id}`)} description={t(`schwartz.valueDescriptions.${v.id}`)} score={v.score} min={-bound} max={bound} delay={0.1 + i * 0.025} />
          ))}
        </div>
      </section>

      {/* Divider + label introducing the higher-order group */}
      <div className="mt-8 mb-4 border-t border-persona-line pt-6">
        <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">{t('schwartz.higherHeading')}</h3>
        <p className="text-sm text-persona-muted mt-1">{t('schwartz.higherSub')}</p>
      </div>

      <section className="surface-warm rounded-3xl p-5 sm:p-6">
        <div className="divide-y divide-persona-line/60">
          {higherOrder.map((v, i) => (
            <ScaleBar key={v.id} label={t(`schwartz.higherNames.${v.id}`)} description={t(`schwartz.higherDescriptions.${v.id}`)} score={v.score} min={-bound} max={bound} delay={0.15 + i * 0.05} />
          ))}
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto mt-10">
        {actions ?? (
          <>
            <motion.button
              onClick={onViewPortrait}
              className="btn-primary w-full"
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {t('viewPortrait')}
            </motion.button>
            <motion.button
              onClick={onRetake}
              className="text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1.5 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-2 py-1"
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <HiOutlineArrowPath className="w-4 h-4" /> {t('retake')}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
