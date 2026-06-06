import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineArrowPath } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import { testsApi } from '../../api/tests';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';

// Shares one in-flight getResult per testId, so StrictMode's double mount (and
// any concurrent mounts) reuse a single backend request instead of firing two.
const inFlight = new Map();

function fetchInterpretation(testId) {
  let promise = inFlight.get(testId);
  if (!promise) {
    promise = testsApi.getResult(testId).finally(() => inFlight.delete(testId));
    inFlight.set(testId, promise);
  }
  return promise;
}

export default function AiInterpretation({ testId, initialInterpretation, delay = 0 }) {
  const [text, setText] = useState(initialInterpretation || null);
  const [loading, setLoading] = useState(!initialInterpretation);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (text) return;

    let active = true;

    // GET triggers lazy generation server-side and resolves once it's ready
    // (~30s on the first request, then instantly from the DB cache).
    fetchInterpretation(testId)
      .then((res) => {
        if (!active) return;
        if (res?.interpretation) setText(res.interpretation);
        else setError(true);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [testId, text]);

  const retry = () => {
    setError(false);
    setLoading(true);
    setText(null); // triggers the effect to re-fetch
  };

  return (
    <motion.section
      className="surface-warm rounded-3xl p-5 sm:p-6 mt-8 mb-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <header className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 bg-persona-accent-peach rounded-2xl flex items-center justify-center flex-shrink-0">
          <HiOutlineSparkles className="w-5 h-5 text-persona-dark" />
        </div>
        <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">
          AI interpretation
        </h3>
      </header>

      {loading && (
        <div className="flex items-center gap-3 py-6 text-persona-muted">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
            className="inline-flex"
          >
            <HiOutlineArrowPath className="w-5 h-5" />
          </motion.span>
          <span className="text-sm">Generating your personalized analysis… this can take up to a minute.</span>
        </div>
      )}

      {!loading && error && (
        <div className="py-4">
          <p className="text-sm text-persona-muted mb-3">
            Couldn’t generate the interpretation right now.
          </p>
          <button
            onClick={retry}
            className="text-sm text-persona-dark font-medium inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach rounded px-1 py-0.5"
          >
            <HiOutlineArrowPath className="w-4 h-4" /> Try again
          </button>
        </div>
      )}

      {!loading && !error && text && (
        <div className="text-persona-dark">
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{text}</ReactMarkdown>
        </div>
      )}
    </motion.section>
  );
}
