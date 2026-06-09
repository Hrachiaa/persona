import { motion } from 'framer-motion';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import ScaleBar from './ScaleBar';

const byScoreDesc = (a, b) => b.score - a.score;

// PID-5: 25 maladaptive facets (top) + 5 broad domains (bottom),
// each sorted highest-first, on a 0..3 scale.
export default function PidResultScreen({ result, meta, onDone, onRetake, onViewPortrait }) {
  const r = result?.result || {};
  const Icon = meta.icon;

  const facets = Object.values(r.values || {}).sort(byScoreDesc);
  const domains = Object.values(r.higherOrderValues || {}).sort(byScoreDesc);

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
        <h2 className="font-display text-3xl font-semibold text-persona-dark mb-2">Your personality facets</h2>
        <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
          Maladaptive personality traits from the PID-5 — higher bars indicate stronger
          expression. Your most pronounced traits appear first.
        </p>
      </div>

      {/* Facets */}
      <section className="surface-warm rounded-3xl p-5 sm:p-6">
        <header className="mb-4">
          <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">Facets</h3>
          <p className="text-sm text-persona-muted mt-1">25 trait facets</p>
        </header>
        <div className="divide-y divide-persona-line/60">
          {facets.map((f, i) => (
            <ScaleBar key={f.name} label={f.name} description={f.description} score={f.score} min={0} max={3} delay={0.1 + i * 0.02} />
          ))}
        </div>
      </section>

      {/* Divider + label introducing the domain group */}
      <div className="mt-8 mb-4 border-t border-persona-line pt-6">
        <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">Domains</h3>
        <p className="text-sm text-persona-muted mt-1">Five broad domains</p>
      </div>

      <section className="surface-warm rounded-3xl p-5 sm:p-6">
        <div className="divide-y divide-persona-line/60">
          {domains.map((d, i) => (
            <ScaleBar key={d.name} label={d.name} description={d.description} score={d.score} min={0} max={3} delay={0.15 + i * 0.05} />
          ))}
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto mt-10">
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
