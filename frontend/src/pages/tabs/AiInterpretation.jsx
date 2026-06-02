import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineArrowPath } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import { testsApi } from '../../api/tests';

// Tailwind-styled renderers so the AI Markdown matches the persona design tokens.
const MARKDOWN_COMPONENTS = {
  h1: ({ children }) => (
    <h1 className="font-display text-2xl font-semibold text-persona-dark mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display text-lg font-semibold text-persona-dark mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display text-base font-semibold text-persona-dark mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => <p className="text-sm text-persona-dark/80 leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-persona-dark/80 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-persona-dark">{children}</strong>,
  hr: () => <hr className="border-persona-line/60 my-4" />,
};

export default function AiInterpretation({ testId, initialInterpretation, delay = 0 }) {
  const [text, setText] = useState(initialInterpretation || null);
  const [loading, setLoading] = useState(!initialInterpretation);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (text) return;

    let active = true;

    // GET triggers lazy generation server-side and resolves once it's ready
    // (~30s on the first request, then instantly from the DB cache).
    // In StrictMode (dev) this runs twice — the `active` flag keeps the latest
    // mount in control; the extra GET just hits the cache.
    testsApi
      .getResult(testId)
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
      className="surface-warm rounded-3xl p-5 sm:p-6 mb-8"
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
