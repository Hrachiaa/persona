import { motion } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineLockClosed, HiOutlineArrowRight } from 'react-icons/hi2';

// Mirror the backend portrait base milestone (see backend/src/tests/test-order.ts).
const PORTRAIT_BASE = ['bigFive', 'shcwartz', 'cope', 'iq'];

// First-screen teaser: shows unlock progress, and once the first 4 tests are done
// turns into a CTA that opens the dedicated portrait screen (where generation
// happens). It never generates anything itself.
export default function PersonaPortrait({ completedTypes, onOpen }) {
  const baseDone = PORTRAIT_BASE.filter((t) => completedTypes.has(t)).length;
  const unlocked = baseDone >= PORTRAIT_BASE.length;

  // ─── Locked: progress teaser ───────────────────────────────────────────────
  if (!unlocked) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-warm rounded-4xl p-6 mb-6 border border-white/50"
      >
        <header className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 bg-persona-accent-lavender rounded-2xl flex items-center justify-center flex-shrink-0">
            <HiOutlineSparkles className="w-5 h-5 text-persona-dark" />
          </div>
          <h3 className="font-display text-xl font-semibold text-persona-dark">Your portrait</h3>
        </header>
        <p className="text-sm text-persona-muted leading-relaxed mb-5">
          Complete your first 4 tests and AI will weave them into one personal portrait — who you
          are across everything you&apos;ve answered.
        </p>

        {/* Progress pieces */}
        <div className="flex items-center gap-1.5 mb-2">
          {PORTRAIT_BASE.map((t, i) => (
            <motion.div
              key={t}
              className={`h-2.5 flex-1 rounded-full ${
                i < baseDone ? 'bg-persona-accent-peach' : 'bg-persona-line'
              }`}
              initial={{ scaleX: 0.6, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
            />
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-persona-muted">
          <HiOutlineLockClosed className="w-3.5 h-3.5" />
          {baseDone} of {PORTRAIT_BASE.length} pieces unlocked
        </p>
      </motion.section>
    );
  }

  // ─── Unlocked: CTA into the portrait screen ────────────────────────────────
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      className="surface-warm rounded-4xl p-6 mb-6 border border-white/50 w-full text-left card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-persona-accent-peach rounded-2xl flex items-center justify-center flex-shrink-0">
          <HiOutlineSparkles className="w-6 h-6 text-persona-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">
            Your portrait is ready
          </h3>
          <p className="text-sm text-persona-muted mt-0.5">
            See what your tests say about you, together.
          </p>
        </div>
        <HiOutlineArrowRight className="w-5 h-5 text-persona-muted flex-shrink-0" />
      </div>
    </motion.button>
  );
}
