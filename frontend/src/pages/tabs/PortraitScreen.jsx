import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineArrowPath } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import { portraitApi } from '../../api/portrait';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';

// Mirror the backend portrait full milestone (see backend/src/tests/test-order.ts).
const PORTRAIT_FULL = ['bigFive', 'shcwartz', 'cope', 'iq', 'ecr', 'pid'];

// One shared in-flight request so StrictMode's double mount reuses a single
// backend call instead of firing two generations.
let inFlight = null;
function fetchPortrait() {
  if (!inFlight) inFlight = portraitApi.getPortrait().finally(() => { inFlight = null; });
  return inFlight;
}

// Dedicated immersive screen: generates (first view, ~up to a minute) and renders
// the full portrait. The Tests component wraps this with the immersive top bar.
export default function PortraitScreen({ completedTypes }) {
  const remainingForFull = PORTRAIT_FULL.filter((t) => !completedTypes.has(t)).length;

  const [data, setData] = useState(null); // { content, basedOn } | null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(1); // bump to (re)fetch

  useEffect(() => {
    let active = true;
    // Cached server-side after the first generation; regenerates on its own once
    // a new milestone (all 6 tests) is reached.
    fetchPortrait()
      .then((res) => {
        if (!active) return;
        if (res?.status === 'ready') setData({ content: res.content, basedOn: res.basedOn || [] });
        else setError(true);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [nonce]);

  // Safe to call from event handlers (not synchronously inside the effect).
  const retry = () => {
    setError(false);
    setLoading(true);
    setNonce((n) => n + 1);
  };

  const basedOnFull = (data?.basedOn?.length ?? 0) >= PORTRAIT_FULL.length;
  const canRebuild = data && !basedOnFull && remainingForFull === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-2 pb-24"
    >
      <header className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-persona-accent-peach rounded-2xl flex items-center justify-center flex-shrink-0">
          <HiOutlineSparkles className="w-6 h-6 text-persona-dark" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-persona-dark">Your portrait</h2>
      </header>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 py-8 text-persona-muted"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              className="inline-flex mt-0.5"
            >
              <HiOutlineArrowPath className="w-5 h-5" />
            </motion.span>
            <span className="text-sm leading-relaxed">
              Building your portrait from all your tests… this can take up to a minute.
            </span>
          </motion.div>
        )}

        {!loading && error && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <p className="text-sm text-persona-muted mb-4">Couldn&apos;t build your portrait right now.</p>
            <motion.button onClick={retry} className="btn-secondary inline-flex items-center gap-2" whileTap={{ scale: 0.97 }}>
              <HiOutlineArrowPath className="w-4 h-4" /> Try again
            </motion.button>
          </motion.div>
        )}

        {!loading && !error && data && (
          <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-persona-dark">
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>{data.content}</ReactMarkdown>
            </div>

            {/* Milestone hints */}
            {!basedOnFull && remainingForFull > 0 && (
              <p className="text-xs text-persona-muted mt-6 pt-5 border-t border-persona-line/60">
                Take {remainingForFull} more test{remainingForFull > 1 ? 's' : ''} and your portrait will be
                rebuilt deeper — across everything you&apos;ve done.
              </p>
            )}
            {canRebuild && (
              <motion.button
                onClick={retry}
                className="btn-secondary w-full mt-6 inline-flex items-center justify-center gap-2"
                whileTap={{ scale: 0.97 }}
              >
                <HiOutlineSparkles className="w-4 h-4" /> Rebuild with all 6 tests
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
