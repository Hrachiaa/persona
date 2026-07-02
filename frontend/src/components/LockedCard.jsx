import { motion } from 'framer-motion';
import { HiOutlineSparkles } from 'react-icons/hi2';

// The "finish all tests first" gate screen shared by the Chat and Reads tabs.
// Fixed full-screen (the dashboard chrome floats over it); copy comes from the
// caller's namespace so each tab keeps its own wording.
export default function LockedCard({ title, body, progressLabel, ctaLabel, completed, required, onOpenTests }) {
  const pct = Math.round((completed / required) * 100);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg flex items-center justify-center px-6 pt-20 pb-24 lg:py-6"
    >
      <div className="surface-warm rounded-4xl p-8 text-center max-w-md w-full">
        <div className="w-14 h-14 mx-auto mb-4 bg-persona-accent-lime/60 rounded-3xl flex items-center justify-center">
          <HiOutlineSparkles className="w-7 h-7 text-persona-dark" />
        </div>
        <h2 className="font-display text-xl font-semibold text-persona-dark mb-1.5">{title}</h2>
        <p className="text-sm text-persona-muted leading-relaxed mb-5">{body}</p>
        <div className="relative h-2.5 bg-persona-line/60 rounded-full overflow-hidden mb-2">
          <motion.div
            className="absolute inset-y-0 left-0 bg-persona-accent-lime rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-persona-muted mb-6 tabular">{progressLabel}</p>
        {onOpenTests && (
          <motion.button onClick={onOpenTests} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
            {ctaLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
