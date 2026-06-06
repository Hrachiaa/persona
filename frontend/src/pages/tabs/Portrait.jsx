import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineArrowPath, HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import { portraitApi } from '../../api/portrait';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';

const TOTAL_TESTS = 6;

// One shared in-flight request so StrictMode's double mount reuses a single
// backend call instead of firing two generations.
let inFlight = null;
function fetchPortrait() {
  if (!inFlight) inFlight = portraitApi.getPortrait().finally(() => { inFlight = null; });
  return inFlight;
}

// The portrait tab. Fetches GET /portrait, which lazily generates (and caches)
// an AI synthesis of every test the user has completed, regrowing as they finish
// more. The dry per-test results live on the Tests tab; interpretation lives here.
export default function Portrait() {
  const [data, setData] = useState(null); // backend response: { status, ... }
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [nonce, setNonce] = useState(0); // bump to refetch

  useEffect(() => {
    let active = true;
    fetchPortrait()
      .then((r) => { if (active) setData(r); })
      .catch(() => active && setErrored(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [nonce]);

  // Safe to call from event handlers (not synchronously inside the effect).
  const retry = () => {
    setErrored(false);
    setLoading(true);
    setData(null);
    setNonce((n) => n + 1);
  };

  const isError = errored || data?.status === 'error';
  const isLocked = !isError && data?.status === 'locked';
  const isReady = !isError && data?.status === 'ready';
  const includedCount = data?.basedOn?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-2 pb-6"
    >
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-persona-accent-peach rounded-2xl flex items-center justify-center flex-shrink-0">
          <HiOutlineSparkles className="w-6 h-6 text-persona-dark" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-persona-dark leading-tight">Your portrait</h1>
          {isReady && (
            <p className="text-xs text-persona-muted mt-0.5">
              Synthesized from {includedCount} of {TOTAL_TESTS} tests
            </p>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="surface-warm rounded-4xl p-6 flex items-start gap-3 text-persona-muted"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              className="inline-flex mt-0.5"
            >
              <HiOutlineArrowPath className="w-5 h-5" />
            </motion.span>
            <span className="text-sm leading-relaxed">
              Building your portrait from your tests… this can take up to a minute.
            </span>
          </motion.div>
        )}

        {!loading && isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="surface-warm rounded-4xl p-6"
          >
            <p className="text-sm text-persona-muted mb-4">Couldn&apos;t build your portrait right now.</p>
            <motion.button onClick={retry} className="btn-secondary inline-flex items-center gap-2" whileTap={{ scale: 0.97 }}>
              <HiOutlineArrowPath className="w-4 h-4" /> Try again
            </motion.button>
          </motion.div>
        )}

        {!loading && isLocked && (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="surface-warm rounded-4xl p-8 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 bg-persona-accent-lavender/60 rounded-3xl flex items-center justify-center">
              <HiOutlineClipboardDocumentList className="w-7 h-7 text-persona-dark" />
            </div>
            <h2 className="font-display text-xl font-semibold text-persona-dark mb-1.5">No portrait yet</h2>
            <p className="text-sm text-persona-muted leading-relaxed max-w-prose mx-auto">
              Take your first test and AI will start drawing a portrait of you here — growing richer
              with every test you finish.
            </p>
          </motion.div>
        )}

        {!loading && isReady && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="surface-warm rounded-4xl p-6"
          >
            <div className="text-persona-dark">
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>{data.content}</ReactMarkdown>
            </div>

            {includedCount < TOTAL_TESTS && (
              <p className="text-xs text-persona-muted mt-6 pt-5 border-t border-persona-line/60">
                Finish the remaining {TOTAL_TESTS - includedCount} test{TOTAL_TESTS - includedCount > 1 ? 's' : ''} and
                your portrait will be rebuilt deeper, across everything you&apos;ve done.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
