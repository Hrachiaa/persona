import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChevronDown } from 'react-icons/hi2';
import { percentileColor } from '../../utils/tScore.js';

// A reusable horizontal score bar with a configurable [min, max] range.
//
// The fill is anchored at the position of 0 within the track, so:
//  • symmetric ranges (e.g. schwartz −4..+4) diverge from a centered zero —
//    positive scores grow right, negative grow left;
//  • non-negative ranges (ecr 1..7, cope 1..4, pid 0..3) reduce to an ordinary
//    left-anchored fill.
//
// With a `description`, the row becomes a disclosure: a chevron per facet, and
// tapping anywhere on the row unfolds a paragraph explaining the scale.
//
// `integer` renders the value without decimals (Big Five percentiles).
//
// Colors reuse the project's in-palette `percentileColor`, keyed off the score's
// position in the range so warmer = higher.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 1 decimal, with an explicit sign for diverging (zero-crossing) scales.
function formatScore(score, signed) {
  const rounded = Math.round(score * 10) / 10;
  const text = rounded.toFixed(1);
  return signed && rounded > 0 ? `+${text}` : text;
}

export default function ScaleBar({ label, description, score, min, max, delay = 0, integer = false }) {
  const [open, setOpen] = useState(false);
  const expandable = !!description;

  const range = max - min || 1;
  const toPct = (v) => clamp(((v - min) / range) * 100, 0, 100);

  const zeroPct = toPct(clamp(0, min, max)); // where 0 sits within the track
  const valuePct = toPct(score);
  const left = Math.min(zeroPct, valuePct);
  const width = Math.abs(valuePct - zeroPct);

  const diverging = min < 0 && max > 0;
  const color = percentileColor(valuePct);

  const scoreText = integer ? String(Math.round(score)) : formatScore(score, diverging);

  const chevron = (
    <motion.span
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      className="inline-flex text-persona-muted flex-shrink-0"
      aria-hidden="true"
    >
      <HiOutlineChevronDown className="w-4 h-4" />
    </motion.span>
  );

  // Mobile: label + score above the full-width bar, so long localized scale
  // names (e.g. ru «Самостоятельность: действия») never truncate into
  // indistinguishable rows. Desktop (sm+): the original dense single row.
  const Row = expandable ? 'button' : 'div';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <Row
        {...(expandable
          ? {
              type: 'button',
              onClick: () => setOpen((o) => !o),
              'aria-expanded': open,
              'aria-label': label,
            }
          : {})}
        className={`w-full text-left py-2 sm:flex sm:items-center sm:gap-3 ${
          expandable
            ? 'cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-white'
            : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5 sm:mb-0 sm:w-44 sm:flex-shrink-0">
          <span className="text-sm text-persona-dark/80 min-w-0 sm:truncate" title={label}>
            {label}
          </span>
          <span className="flex items-center gap-1.5 flex-shrink-0 sm:hidden">
            <span className="text-sm font-medium text-persona-dark tabular">{scoreText}</span>
            {expandable && chevron}
          </span>
        </div>

        <div className="relative sm:flex-1 h-2.5 bg-persona-line/60 rounded-full overflow-hidden">
          <motion.div
            className={`absolute top-0 bottom-0 ${color.bar} rounded-full`}
            initial={{ width: 0, left: `${zeroPct}%` }}
            animate={{ width: `${width}%`, left: `${left}%` }}
            transition={{ duration: 0.7, delay, ease: 'easeOut' }}
          />
        </div>

        <span className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-medium text-persona-dark tabular w-12 text-right">{scoreText}</span>
          {expandable ? chevron : <span className="w-4" aria-hidden="true" />}
        </span>
      </Row>

      {expandable && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <p className="text-sm text-persona-muted leading-relaxed pb-3 pt-0.5 pr-6 max-w-prose">
                {description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
