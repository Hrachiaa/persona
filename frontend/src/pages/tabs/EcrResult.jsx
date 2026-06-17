import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import EcrQuadrant from './EcrQuadrant';
import ImmersiveTopBar from './ImmersiveTopBar';

// ECR-R: two attachment subscales (anxiety, avoidance) on a 1..7 scale.
// The pair is plotted on a quadrant map whose midpoint (4, 4) splits the
// plane into the four classic attachment styles.
export default function EcrResultScreen({ result, onDone, onRetake, onViewPortrait, headerAction, actions, ownerName }) {
  const r = result?.result || {};
  const anxiety = Number(r.anxiety) || 0;
  const avoidance = Number(r.avoidance) || 0;

  // The graph plays an intro (dots pour in, then the "You" dot lands). Only
  // once it signals ready do the heading, text and actions fade in.
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-dvh flex flex-col"
    >
      <div className="transition-opacity duration-[800ms] ease-out" style={{ opacity: revealed ? 1 : 0, pointerEvents: revealed ? 'auto' : 'none' }}>
        <ImmersiveTopBar onBack={onDone} rightSlot={headerAction} />
      </div>

      <div className="flex-1 flex flex-col px-4 sm:px-6 pb-10">
        {/* Hero — fades in after the graph intro */}
        <div className="text-center mb-4 transition-opacity duration-[800ms] ease-out" style={{ opacity: revealed ? 1 : 0 }}>
          <h2 className="font-display text-3xl font-semibold text-persona-dark">{ownerName ? `${ownerName}’s attachment style` : 'Your attachment style'}</h2>
        </div>

        {/* Quadrant map */}
        <section className="w-full max-w-2xl mx-auto">
          <EcrQuadrant anxiety={anxiety} avoidance={avoidance} youLabel={ownerName || 'You'} onReady={() => setRevealed(true)} />
        </section>

        {/* Explanation — fades in after the graph intro */}
        <div
          className="mt-8 max-w-sm mx-auto space-y-4 text-sm text-persona-muted leading-relaxed transition-opacity duration-[800ms] ease-out"
          style={{ opacity: revealed ? 1 : 0 }}
        >
          <p>
            Higher <span className="font-semibold text-persona-dark">anxiety</span> scores indicate greater fear of
            rejection and abandonment, while lower scores reflect a sense of security in relationships.
          </p>
          <p>
            Higher <span className="font-semibold text-persona-dark">avoidance</span> scores indicate a preference for
            emotional distance and self-reliance, while lower scores reflect ease with intimacy and interdependence.
          </p>
        </div>

        {/* Footer actions — fade in after the graph intro */}
        <div
          className="mt-10 flex flex-col gap-3 max-w-sm w-full mx-auto transition-opacity duration-[800ms] ease-out"
          style={{ opacity: revealed ? 1 : 0, pointerEvents: revealed ? 'auto' : 'none' }}
        >
          {actions ?? (
            <>
              <motion.button
                onClick={onViewPortrait}
                className="btn-primary w-full"
                whileTap={{ scale: 0.97 }}
              >
                View portrait
              </motion.button>
              <motion.button
                onClick={onRetake}
                className="text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1.5 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-2 py-1"
                whileTap={{ scale: 0.97 }}
              >
                <HiOutlineArrowPath className="w-4 h-4" /> Retake test
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
