import { motion } from 'framer-motion';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import ScaleBar from './ScaleBar';
import ImmersiveTopBar from './ImmersiveTopBar';

// ECR-R: two attachment subscales (anxiety, avoidance) on a 1..7 scale.
// The backend returns plain numbers keyed by name, so labels are derived from
// the keys and the natural order is preserved (no sorting).
export default function EcrResultScreen({ result, onDone, onRetake, onViewPortrait }) {
  const r = result?.result || {};

  const scales = Object.entries(r).map(([key, score]) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    score,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-dvh flex flex-col"
    >
      <ImmersiveTopBar onBack={onDone} />

      <div className="flex-1 flex flex-col px-5 sm:px-6 pb-10">
        {/* Hero */}
        <div className="text-center mb-6">
          <h2 className="font-display text-3xl font-semibold text-persona-dark mb-2">Your attachment style</h2>
          <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
            Two dimensions of how you relate in close relationships. Lower scores on both point
            toward a more secure attachment.
          </p>
        </div>

        {/* Scales */}
        <section className="surface-warm rounded-3xl p-5 sm:p-6">
          <header className="mb-4">
            <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">Attachment scales</h3>
            <p className="text-sm text-persona-muted mt-1">Two subscales</p>
          </header>
          <div className="divide-y divide-persona-line/60">
            {scales.map((s, i) => (
              <ScaleBar key={s.label} label={s.label} score={s.score} min={1} max={7} delay={0.15 + i * 0.08} />
            ))}
          </div>
        </section>

        {/* Footer actions — pinned to the bottom of the screen */}
        <div className="mt-auto pt-10 flex flex-col gap-3 max-w-sm w-full mx-auto">
          <motion.button
            onClick={onViewPortrait}
            className="btn-primary w-full"
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            View portrait
          </motion.button>
          <motion.button
            onClick={onRetake}
            className="text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1.5 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-2 py-1"
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <HiOutlineArrowPath className="w-4 h-4" /> Retake test
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
