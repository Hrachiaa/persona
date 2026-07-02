import { motion } from 'framer-motion';
import { percentileColor } from '../../utils/tScore.js';

// A reusable horizontal score bar with a configurable [min, max] range.
//
// The fill is anchored at the position of 0 within the track, so:
//  • symmetric ranges (e.g. schwartz −4..+4) diverge from a centered zero —
//    positive scores grow right, negative grow left;
//  • non-negative ranges (ecr 1..7, cope 1..4, pid 0..3) reduce to an ordinary
//    left-anchored fill.
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

export default function ScaleBar({ label, description, score, min, max, delay = 0 }) {
  const range = max - min || 1;
  const toPct = (v) => clamp(((v - min) / range) * 100, 0, 100);

  const zeroPct = toPct(clamp(0, min, max)); // where 0 sits within the track
  const valuePct = toPct(score);
  const left = Math.min(zeroPct, valuePct);
  const width = Math.abs(valuePct - zeroPct);

  const diverging = min < 0 && max > 0;
  const color = percentileColor(valuePct);
  const title = [label, description].filter(Boolean).join(' — ');

  const scoreText = formatScore(score, diverging);

  // Mobile: label + score above the full-width bar, so long localized scale
  // names (e.g. ru «Самостоятельность: действия») never truncate into
  // indistinguishable rows. Desktop (sm+): the original dense single row.
  return (
    <motion.div
      className="py-2 sm:flex sm:items-center sm:gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1.5 sm:mb-0 sm:block sm:w-44 sm:flex-shrink-0">
        <span className="text-sm text-persona-dark/80 sm:block sm:truncate" title={title}>
          {label}
        </span>
        <span className="text-sm font-medium text-persona-dark tabular flex-shrink-0 sm:hidden">
          {scoreText}
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

      <span className="hidden sm:block text-sm font-medium text-persona-dark tabular w-12 text-right flex-shrink-0">
        {scoreText}
      </span>
    </motion.div>
  );
}
