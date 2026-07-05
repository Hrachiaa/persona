import { motion } from 'framer-motion';

// The "finish all tests first" gate shared by the Chat and Reads tabs. Not a
// shrug screen — it sells the locked feature the way the Friends empty state
// does: a live vignette previewing the feature, value bullets, then progress.
// Copy and the vignette come from the caller so each tab keeps its own story.
// `partial` is fractional credit for half-finished chunked tests (see
// partialTestCredit) — it part-fills the next segment even though the label
// counts whole tests.
export default function LockedCard({
  vignette,
  title,
  body,
  perks,
  accent = 'bg-persona-accent-lime',
  progressLabel,
  ctaLabel,
  completed,
  required,
  partial = 0,
  onOpenTests,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg overflow-y-auto hide-scrollbar"
    >
      <div className="min-h-full flex justify-center px-5 pt-[4.75rem] pb-24 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="surface-warm rounded-4xl px-6 sm:px-8 pt-6 pb-6 text-center max-w-md w-full my-auto h-fit"
        >
          {vignette}

          <h2 className="font-display text-[1.35rem] leading-snug font-semibold text-persona-dark mb-1.5">
            {title}
          </h2>
          <p className="text-sm text-persona-muted leading-relaxed max-w-prose mx-auto mb-5">{body}</p>

          {perks?.length > 0 && (
            <ul className="text-left space-y-2.5 max-w-xs mx-auto mb-6">
              {perks.map(({ Icon, tint, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className={`w-8 h-8 shrink-0 rounded-xl ${tint} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-persona-dark" />
                  </span>
                  <span className="text-sm text-persona-dark/85 leading-relaxed pt-1">{text}</span>
                </li>
              ))}
            </ul>
          )}

          {/* One segment per test — progress toward the key, not an abstract bar. */}
          <div className="flex gap-1.5 mb-2" aria-hidden="true">
            {Array.from({ length: required }, (_, i) => {
              const fill = i < completed ? 1 : i === completed ? Math.min(1, partial) : 0;
              return (
                <div key={i} className="h-2 flex-1 rounded-full bg-persona-line/70 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${accent}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${fill * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 + i * 0.07 }}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-persona-muted mb-5 tabular">{progressLabel}</p>

          {onOpenTests && (
            <motion.button onClick={onOpenTests} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
              {ctaLabel}
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
