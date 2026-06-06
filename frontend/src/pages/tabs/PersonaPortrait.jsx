import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineLockClosed, HiOutlineArrowRight } from 'react-icons/hi2';

// Mirror the backend portrait base milestone (see backend/src/tests/test-order.ts).
const PORTRAIT_BASE = ['bigFive', 'shcwartz', 'cope', 'iq'];
const SEEN_FLAG = 'portrait_seen';

// First-screen teaser. Three states:
//  • locked  — unlock progress, while fewer than 4 tests are done;
//  • created — a glowing celebration the first time the portrait is unlocked
//              (right after the IQ test); tapping it only dismisses the fanfare;
//  • ready   — the calm CTA that opens the dedicated portrait screen.
// It never generates anything itself.
export default function PersonaPortrait({ completedTypes, onOpen }) {
  const baseDone = PORTRAIT_BASE.filter((t) => completedTypes.has(t)).length;
  const unlocked = baseDone >= PORTRAIT_BASE.length;
  const [seen, setSeen] = useState(() => !!localStorage.getItem(SEEN_FLAG));

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

  // ─── Just unlocked: glowing celebration ────────────────────────────────────
  if (!seen) {
    const dismiss = () => {
      localStorage.setItem(SEEN_FLAG, '1');
      setSeen(true);
    };
    return (
      <motion.button
        type="button"
        onClick={dismiss}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          boxShadow: [
            '0 0 0 0 rgba(253,186,116,0.0)',
            '0 0 40px 6px rgba(253,186,116,0.55)',
            '0 0 0 0 rgba(253,186,116,0.0)',
          ],
        }}
        transition={{
          opacity: { duration: 0.4 },
          scale: { type: 'spring', stiffness: 220, damping: 18 },
          boxShadow: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
        }}
        whileTap={{ scale: 0.98 }}
        className="relative w-full rounded-4xl p-7 mb-6 text-center bg-gradient-to-br from-persona-accent-peach via-persona-accent-lavender to-persona-accent-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-dark/20"
      >
        <motion.div
          className="w-14 h-14 mx-auto mb-4 bg-white/70 rounded-3xl flex items-center justify-center"
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <HiOutlineSparkles className="w-7 h-7 text-persona-dark" />
        </motion.div>
        <h3 className="font-display text-2xl font-semibold text-persona-dark">Your portrait is created</h3>
        <p className="text-sm text-persona-dark/70 mt-1">Tap to continue</p>
      </motion.button>
    );
  }

  // ─── Ready: calm CTA into the portrait screen ──────────────────────────────
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
