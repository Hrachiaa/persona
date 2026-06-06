import { motion } from 'framer-motion';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import ScaleBar from './ScaleBar';

const byScoreDesc = (a, b) => b.score - a.score;

// COPE: 15 coping-strategy scales, sorted highest-first, on a 1..4 scale.
export default function CopeResultScreen({ result, meta, onDone, onRetake, onViewPortrait }) {
  const r = result?.result || {};
  const Icon = meta.icon;

  const scales = Object.values(r).sort(byScoreDesc);

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
        <h2 className="font-display text-3xl font-semibold text-persona-dark mb-2">Your coping profile</h2>
        <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
          The coping strategies you lean on under stress, strongest first. Higher bars are the
          responses you reach for most.
        </p>
      </div>

      {/* Scales */}
      <section className="surface-warm rounded-3xl p-5 sm:p-6">
        <header className="mb-4">
          <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">Coping strategies</h3>
          <p className="text-sm text-persona-muted mt-1">15 strategies</p>
        </header>
        <div className="divide-y divide-persona-line/60">
          {scales.map((s, i) => (
            <ScaleBar key={s.name} label={s.name} description={s.description} score={s.score} min={1} max={4} delay={0.1 + i * 0.03} />
          ))}
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto">
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
          onClick={onDone}
          className="btn-secondary w-full"
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Done
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
    </motion.div>
  );
}
