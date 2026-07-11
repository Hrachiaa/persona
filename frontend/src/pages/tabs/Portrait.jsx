import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform, useMotionValueEvent } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineChevronDown, HiOutlineChatBubbleLeftRight, HiOutlineClock, HiOutlineXMark, HiOutlineSparkles, HiOutlineLightBulb } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import { chatApi } from '../../api/chat';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';
import { SIGILS } from '../../components/testSigils';
import { showToast } from '../../components/Toast';
import { TOTAL_TESTS } from '../../utils/constants';
import { PART_SIZE } from './testParts';
import { fetchTestsCached, getCachedTests } from './testsCache';
import { fetchPortrait, getCachedPortrait } from './portraitCache';
import posthog from 'posthog-js';

// ─── Segmented part-progress ring ────────────────────────────────────────────
// For a chunked test left half-finished (see PART_SIZE in Tests.jsx), the orb
// wears a ring of one arc per part, lit up to the number of completed parts.
const polar = (r, deg) => { const a = (deg * Math.PI) / 180; return [r * Math.cos(a), r * Math.sin(a)]; };
const arcPath = (r, a0, a1) => {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// The segment ring for a test's orb: `done` of `total` parts. A finished test
// lights its orb instead, so a completed test never gets a ring (returns null) —
// and once every test is done nothing lands on the first orb either. The empty
// (0-done) ring only shows on the next test to take, so it reads as "ready", not
// noise. A fragmentless test (no PART_SIZE — e.g. IQ) wears a single-arc ring,
// shown the same way: only as the "ready" beacon when it's next.
function partRingFor(test, completed, isNext) {
  if (!test || completed) return null;
  const size = PART_SIZE[test.testType];
  // Fragmentless tests: one arc, only when this is the next test to take.
  if (!size) return isNext ? { done: 0, total: 1 } : null;
  const total = Math.ceil(test.totalQuestions / size);
  const done = Math.min(test.partsCompleted || 0, total);
  if (done >= total) return null;
  if (done === 0 && !isNext) return null;
  return { done, total };
}

// Sigils whose orb opens an inline test-info card (the same panel the Tests tab shows
// when a test is expanded). `slug` matches TYPE_SLUGS in Tests.jsx.
const SIGIL_TEST_META = {
  bigFive: { slug: 'personality' },
  shcwartz: { slug: 'values' },
  cope: { slug: 'stress' },
  iq: { slug: 'logic' },
  ecr: { slug: 'attachment' },
  pid: { slug: 'shadows' },
};

// The Tests list is fetched once and cached in ./testsCache (module scope, shared
// with the runner) so opening an orb card / revisiting the tab is instant. Shape
// per item: { id, testType, testName, description, duration, totalQuestions,
// result, partsCompleted, partsTotal }.

// The portrait itself is cached the same way in ./portraitCache (shared with the
// session prefetch): revisits re-render the last `ready` response instantly while
// we revalidate in the background.

// How long to wait before re-checking while the portrait is still generating.
const POLL_INTERVAL_MS = 4000;

// ─── The portrait's own symbolic language ────────────────────────────────────
// The per-test sigils + accent colors live in components/testSigils (shared with
// the friends screen). Completed tests light up in their color; the rest stay
// ghosted. Assembled radially around a core "self", they form the portrait you
// are slowly revealing.

// Six orbs in a pointy-top hexagon ring around the centre, in test order so the
// portrait fills clockwise from the top as tests are completed.
const RING = 110;
const SIGIL_LAYOUT = [
  { type: 'bigFive',  x: 0,             y: -RING },
  { type: 'shcwartz', x: RING * 0.866,  y: -RING * 0.5 },
  { type: 'cope',     x: RING * 0.866,  y: RING * 0.5 },
  { type: 'iq',       x: 0,             y: RING },
  { type: 'ecr',      x: -RING * 0.866, y: RING * 0.5 },
  { type: 'pid',      x: -RING * 0.866, y: -RING * 0.5 },
];

// The spring that spins the ring (and counter-spins each glyph upright) when an orb's
// card opens. Shared by both so they cancel exactly and the glyphs never tilt mid-spin.
const RING_SPIN = { type: 'spring', stiffness: 90, damping: 18 };

// The hero: the symbolic self-portrait. `basedOn` (every completed test) lights orbs;
// the next-up test glows as a beacon. When an orb transitions from not-lit to lit it
// gets a one-shot celebratory burst so the moment reads as an event, not a quiet recolor.
function PortraitConstellation({ basedOn, nextTest, onSelectSigil, selectedSigil, partProgress, celebrate }) {
  const { t } = useTranslation('portrait');
  const litArr = basedOn || [];
  const litSet = new Set(litArr);
  const litCount = litArr.length;
  const progress = litCount / SIGIL_LAYOUT.length;

  // Spin the selected orb up to 12 o'clock (right under the card). We keep a *continuous*
  // rotation (a ref that accumulates) and step it by the shortest signed delta from where
  // it already is — so switching e.g. Logic→Attachment turns one notch, not almost the
  // whole way round (computing a fresh absolute angle each time would). Each orb rests at
  // index×60° clockwise from the top; bigFive and the closed state both settle at 0 (mod
  // 360). Re-renders with an unchanged selection are idempotent (delta resolves to 0).
  const selectedIndex = selectedSigil ? SIGIL_LAYOUT.findIndex((s) => s.type === selectedSigil) : -1;
  const rotationRef = useRef(0);
  const desiredMod = selectedIndex > 0 ? -selectedIndex * 60 : 0;
  const shortestDelta = (((desiredMod - rotationRef.current) % 360) + 540) % 360 - 180;
  const ringRotation = rotationRef.current + shortestDelta;
  rotationRef.current = ringRotation;

  // Apply the spin as the SVG `rotate(angle)` transform *attribute*, which pivots about
  // the group's local origin — exactly the centre (the group sits at translate(170,170)).
  // framer's CSS `rotate` instead derives its pivot from the bounding box, which drifted
  // a few px off-centre and made the rays miss the core at large angles. We spring the
  // angle through a motion value and write the attribute on change; the glyphs read the
  // negated value so they stay upright in perfect sync.
  const ringRef = useRef(null);
  const ringTarget = useMotionValue(0);
  useEffect(() => { ringTarget.set(ringRotation); }, [ringRotation, ringTarget]);
  const ringAngle = useSpring(ringTarget, RING_SPIN);
  const negRingAngle = useTransform(ringAngle, (v) => -v);
  useMotionValueEvent(ringAngle, 'change', (v) => {
    ringRef.current?.setAttribute('transform', `rotate(${v})`);
  });

  // One-shot bursts: type -> incrementing key. Only genuine not-lit→lit transitions
  // fire (the ref starts at the mount-time lit set, so revisiting the tab never
  // re-celebrates already-revealed orbs).
  const [bursts, setBursts] = useState({});
  const prevLitRef = useRef(null);
  const litKey = litArr.join(',');
  useEffect(() => {
    const prev = prevLitRef.current;
    if (prev) {
      const newly = litArr.filter((t) => !prev.has(t));
      if (newly.length) {
        setBursts((b) => {
          const next = { ...b };
          newly.forEach((t) => { next[t] = (next[t] || 0) + 1; });
          return next;
        });
      }
    }
    prevLitRef.current = new Set(litArr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litKey]);

  return (
    <motion.div
      className="w-full max-w-[340px] mx-auto mb-3"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <svg
        viewBox="0 0 340 340"
        role="img"
        aria-label={t('ariaLabel', { count: litCount, total: SIGIL_LAYOUT.length })}
        className="w-full h-auto overflow-visible"
      >
        <defs>
          <radialGradient id="portraitCoreGlow">
            <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#FDBA74" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FDBA74" stopOpacity="0" />
          </radialGradient>
          <filter id="portraitOrbGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <g transform="translate(170 170)">
          {/* The ring of rays + orbs spins so the selected orb rides up to the top; the
              core λ is rendered after this group so it stays centered and upright. */}
          <g ref={ringRef} transform="rotate(0)">
          {/* Rays from the core to each orb. The next test glows like a completed one. */}
          {SIGIL_LAYOUT.map((s) => {
            const glow = litSet.has(s.type) || s.type === nextTest;
            return (
              <motion.line
                key={`ray-${s.type}`}
                x1="0" y1="0" x2={s.x} y2={s.y}
                strokeWidth={glow ? 2.4 : 1.4}
                strokeDasharray={glow ? '0' : '2 6'}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ stroke: glow ? SIGILS[s.type].color : '#D8D3C8', opacity: glow ? 0.6 : 0.42 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              />
            );
          })}

          {/* Orbs — one per test */}
          {SIGIL_LAYOUT.map((s, i) => {
            const lit = litSet.has(s.type);
            // The next test to take glows like a completed one, but its halo pulses so it
            // reads as a "do this next" beacon rather than something already revealed.
            const isNext = !lit && s.type === nextTest;
            const glow = lit || isNext;
            const { color, Glyph } = SIGILS[s.type];
            const clickable = !!onSelectSigil && !!SIGIL_TEST_META[s.type];
            // Half-finished chunked test → a segmented ring around the orb.
            const seg = !lit ? partProgress?.[s.type] : null;
            return (
              <g key={s.type} transform={`translate(${s.x} ${s.y})`}>
                <motion.g
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 220, damping: 18 }}
                  onClick={clickable ? () => onSelectSigil(s.type) : undefined}
                  whileTap={clickable ? { scale: 0.92 } : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSigil(s.type); } } : undefined}
                  style={clickable ? { cursor: 'pointer' } : undefined}
                >
                  <title>{t(`sigils.${s.type}`)} — {lit ? t('orbStatus.revealed') : isNext ? t('orbStatus.next') : t('orbStatus.notTaken')}</title>

                  {/* Transparent hit target so the whole orb (incl. the halo gap) is tappable */}
                  {clickable && <circle r="36" fill="transparent" />}

                  {/* Halo — steady when revealed, gently pulsing on the next-up test */}
                  <motion.circle
                    r="34" fill={color} filter="url(#portraitOrbGlow)"
                    animate={isNext ? { opacity: [0.16, 0.42, 0.16] } : { opacity: lit ? 0.28 : 0 }}
                    transition={isNext ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6 }}
                  />

                  {/* Orb body */}
                  <motion.circle
                    r="30"
                    strokeWidth="1.5"
                    animate={{ fill: glow ? color : '#ECE9E1', fillOpacity: glow ? 0.95 : 0.5, stroke: glow ? color : '#E0DCD1' }}
                    transition={{ duration: 0.6 }}
                  />

                  {/* Part-progress ring — one arc per part, lit up to `done`. Sits
                      just outside the orb body; spins with the ring like everything else.
                      When we arrive right after finishing a fragment, the just-filled
                      segment animates from gray to its color (and pulses a burst). */}
                  {seg && Array.from({ length: seg.total }).map((_, k) => {
                    const span = 360 / seg.total;
                    const gap = Math.min(14, span * 0.22);
                    const a0 = -90 + k * span + gap / 2;
                    const a1 = -90 + (k + 1) * span - gap / 2;
                    const filled = k < seg.done;
                    const d = arcPath(39, a0, a1);
                    // The segment that just completed on this visit (1-based `parts`).
                    const justFilled = filled && celebrate?.type === s.type && celebrate?.parts === k + 1;
                    return (
                      <g key={`seg-${k}`}>
                        <motion.path
                          d={d}
                          fill="none"
                          strokeWidth="3"
                          strokeLinecap="round"
                          initial={justFilled ? { stroke: '#D8D3C8', opacity: 0.55 } : { opacity: 0 }}
                          animate={{ stroke: filled ? color : '#D8D3C8', opacity: filled ? 0.95 : 0.55 }}
                          transition={{ duration: justFilled ? 0.7 : 0.5, delay: justFilled ? 0.35 : 0.3 + k * 0.06 }}
                        />
                        {justFilled && (
                          <motion.path
                            d={d}
                            fill="none"
                            stroke={color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ opacity: 0.9, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.5 }}
                            transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
                            style={{ transformOrigin: 'center' }}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Glyph — counter-spins the ring rotation (same motion value) so it
                      stays upright in sync with the ring. */}
                  <motion.g
                    style={{ rotate: negRingAngle }}
                    animate={{ opacity: glow ? 1 : 0.55 }}
                    transition={{ duration: 0.5 }}
                  >
                    <g transform="scale(1.25)">
                      <Glyph c={glow ? '#1A1A1A' : '#A39E92'} />
                    </g>
                  </motion.g>

                  {/* Celebratory burst — a flash + expanding ring, only on a real reveal */}
                  {bursts[s.type] ? (
                    <g key={`burst-${bursts[s.type]}`} style={{ pointerEvents: 'none' }}>
                      <motion.circle r="30" fill={color} initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.85, ease: 'easeOut' }} />
                      <motion.circle r="30" fill="none" stroke={color} strokeWidth="3" initial={{ scale: 0.85, opacity: 0.9 }} animate={{ scale: 2.1, opacity: 0 }} transition={{ duration: 0.95, ease: 'easeOut' }} />
                    </g>
                  ) : null}
                </motion.g>
              </g>
            );
          })}
          </g>

          {/* Core "self" — a warm glow that brightens with progress, anchored by λ.
              Rendered outside the spinning ring so λ stays centered and upright. */}
          <motion.g
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          >
            <circle r="48" fill="url(#portraitCoreGlow)" opacity={0.22 + 0.7 * progress} />
          </motion.g>
          <circle r="22" fill="#FFFFFF" stroke="#E8E5DC" strokeWidth="1.5" />
          <text
            x="0" y="0" textAnchor="middle" dominantBaseline="central"
            fontFamily="Fraunces, Georgia, serif" fontSize="22" fontWeight="600"
            fill="#1A1A1A" opacity={0.35 + 0.65 * progress}
          >
            λ
          </text>
        </g>
      </svg>
    </motion.div>
  );
}

// The accuracy panel under the hero: a fill bar tied to how many tests the portrait
// is built from, plus copy that explains *why* more tests mean a truer portrait, and
// a call to take the rest. Lives *outside* the swap AnimatePresence so the bar
// animates up in place when a richer portrait lands.
function PortraitProgress({ count, total, onTakeTests }) {
  const { t } = useTranslation('portrait');
  const pct = Math.round((count / total) * 100);
  const remaining = total - count;
  const complete = remaining === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-warm rounded-4xl p-6 mb-4"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-medium text-persona-dark">{t('accuracy')}</span>
        <span className="text-sm font-semibold text-persona-dark tabular">{pct}%</span>
      </div>
      <div className="relative h-2.5 bg-persona-line/60 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-persona-accent-peach rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {complete ? (
        <p className="text-sm text-persona-muted leading-relaxed mt-4">
          {t('complete', { total })}
        </p>
      ) : (
        <>
          <p className="text-sm text-persona-muted leading-relaxed mt-4">
            {t('incomplete1', { count, total })}
          </p>
          <p className="text-sm text-persona-dark leading-relaxed mt-2 font-medium">
            {t('incomplete2')}
          </p>
          {onTakeTests && (
            <motion.button onClick={onTakeTests} className="btn-primary w-full mt-5" whileTap={{ scale: 0.97 }}>
              {t('takeMore')}
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
}

// The expanded test panel that opens inline above the constellation when an orb is
// tapped (Duolingo-style — it surfaces in place rather than floating over the screen).
// Two-phase reveal: the outer wrapper grows its height first, opening a gap that eases
// the star down; then the inner bubble pops in (scale from the bottom), as if it rose
// out of the orb like a message. Same content as the Tests tab's expanded card
// (description, time, question count, start / view-result button). `test` is the
// matching Tests-list entry (null while loading).
function SigilInfoCard({ type, test, completed, locked, onStart, onView, onClose }) {
  const { t, i18n } = useTranslation('tests');
  const titleSize = i18n.language?.startsWith('ru') ? 'text-lg' : 'text-xl';

  // A chunked test is taken in several short parts: say so up front ("4 parts of
  // 30 questions"), price one sitting (~5 min), and — when some parts are already
  // committed — resume where the user left off instead of pretending to start over.
  const chunk = PART_SIZE[type];
  const partCount = chunk && test?.totalQuestions != null ? Math.ceil(test.totalQuestions / chunk) : 1;
  const chunkMinutes = chunk && test?.duration > 0 ? Math.round(test.duration / partCount) : (test?.duration ?? 0);
  const chunkQuestions = chunk ? chunk : (test?.totalQuestions ?? null);
  const partsDone = !completed && partCount > 1 ? Math.min(test?.partsCompleted ?? 0, partCount - 1) : 0;

  return (
    <motion.div
      className="w-full max-w-xs overflow-hidden flex-shrink-0 pointer-events-auto"
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      // Close mirrors open in reverse: the bubble retracts first, then the gap closes —
      // so the height collapse waits (delay) for the bubble to tuck away, just as opening
      // the gap leads the bubble's pop-in.
      exit={{ height: 0, transition: { type: 'spring', stiffness: 300, damping: 32, delay: 0.16 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
    >
      <div className="pb-8">
        {/* Phase 2 — the bubble pops up after the gap has opened above the star */}
        <motion.div
          className="surface-warm rounded-3xl p-6 border border-white/50"
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          // Retracts immediately on close (no delay), so it leads the height collapse —
          // the reverse of the open, where it pops in after the gap opens.
          exit={{ opacity: 0, scale: 0.7, y: 12, transition: { type: 'spring', stiffness: 420, damping: 26 } }}
          transition={{ delay: 0.22, type: 'spring', stiffness: 420, damping: 26 }}
          style={{ transformOrigin: 'center bottom' }}
        >
          {/* Header — title + close */}
          <div className="flex items-start gap-3">
            <h3 className={`flex-1 min-w-0 break-words font-display ${titleSize} font-semibold text-persona-dark`}>
              {t(`names.${type}`, { defaultValue: test?.testName })}
            </h3>
            <button
              onClick={onClose}
              aria-label={t('common:close')}
              className="flex-shrink-0 -mr-1 mt-0.5 text-persona-muted hover:text-persona-dark transition-colors"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>

          {/* Detail — locked tests show why they're unavailable (mirrors the Tests tab);
              the rest show the description, time/question chips, and a start/view button. */}
          <div className="pt-3">
            {locked ? (
              <>
                <p className="text-persona-muted text-sm leading-relaxed mb-4">{t('card.lockedHint')}</p>
                <div className="w-full py-3.5 px-8 rounded-full font-medium text-center bg-persona-line text-persona-muted">
                  {t('card.unavailable')}
                </div>
              </>
            ) : (
              <>
                <p className="text-persona-muted text-sm leading-relaxed mb-4">
                  {t(`descriptions.${type}`, { defaultValue: test?.description })}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-persona-dark bg-persona-line/70 px-2.5 py-1 rounded-md">
                    <HiOutlineClock className="w-3.5 h-3.5" />
                    {chunkMinutes > 0
                      ? (partCount > 1 ? t('card.minutesPerPart', { n: chunkMinutes }) : t('card.minutes', { n: chunkMinutes }))
                      : t('card.noTimeLimit')}
                  </span>
                  {chunkQuestions != null && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-persona-dark bg-persona-line/70 px-2.5 py-1 rounded-md tabular">
                      {partCount > 1
                        ? t('card.partsMeta', { count: partCount, n: chunkQuestions })
                        : t('card.questionsCount', { n: chunkQuestions })}
                    </span>
                  )}
                </div>
                {completed ? (
                  <motion.button onClick={onView} className="btn-secondary w-full" whileTap={{ scale: 0.97 }}>
                    {t('card.viewResult')}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={onStart}
                    disabled={!test}
                    className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    whileTap={{ scale: 0.97 }}
                  >
                    {partsDone > 0
                      ? t('card.continuePart', { part: partsDone + 1, parts: partCount })
                      : t('card.start')}
                  </motion.button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// The portrait tab. Fetches GET /portrait — an AI synthesis of every test the user
// has completed, regenerated server-side whenever a test is submitted. A cached
// portrait is shown immediately; while a newer one is generating we keep the old one
// visible (with a subtle "refreshing" hint) and swap in the fresh version with an
// animation once it's ready. The dry per-test results live on the Tests tab;
// interpretation lives here.
// ─── Locked gate vignette ────────────────────────────────────────────────────
// A miniature of the portrait sheet itself, waiting to be written: six sigil
// slots on top (lit by real completion, the next one glowing), blank text lines
// and a blinking caret below. Same visual family as the Chat/Reads gates.
function LockedPortraitVignette({ completedSet, nextTest }) {
  return (
    <div className="relative mx-auto max-w-[16rem] mb-6" aria-hidden="true">
      <motion.div
        className="absolute inset-0 rotate-3 translate-x-3 rounded-3xl bg-persona-accent-lavender/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      <div className="relative rounded-3xl bg-persona-bg px-5 pt-4 pb-5 text-left">
        <div className="flex gap-1.5 mb-4">
          {SIGIL_LAYOUT.map(({ type }, i) => {
            const { color, Glyph } = SIGILS[type];
            const lit = completedSet.has(type);
            const isNext = type === nextTest;
            return (
              <motion.span
                key={type}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isNext && !lit ? 'animate-pulse-soft' : ''}`}
                style={{ backgroundColor: lit || isNext ? color : 'rgba(26,26,26,0.06)' }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.15 + i * 0.05 }}
              >
                <svg viewBox="-14 -14 28 28" width="18" height="18">
                  <Glyph c={lit || isNext ? 'rgba(26,26,26,0.72)' : 'rgba(26,26,26,0.22)'} />
                </svg>
              </motion.span>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 mb-2">
          <motion.span
            className="w-[2px] h-3.5 shrink-0 bg-persona-dark/60"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 1.1 }}
          />
          <div className="h-2 w-full rounded-full bg-persona-line" />
        </div>
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-persona-line" />
          <div className="h-2 w-3/5 rounded-full bg-persona-line" />
        </div>
      </div>
    </div>
  );
}

export default function Portrait() {
  const { t } = useTranslation('portrait');
  const navigate = useNavigate();
  const location = useLocation();
  // Set when arriving straight from finishing a test fragment: { type, parts }.
  // Captured once (useState initializer) so the just-filled progress segment plays
  // its fill animation a single time, even as the constellation re-renders.
  const [celebrate] = useState(() => location.state?.celebrate);
  // Set when another tab's "take a test" CTA sent the user here: once the test list
  // is known, the next test's card opens by itself instead of leaving the user to
  // guess that the orbs are tappable.
  const [pendingOpenNext, setPendingOpenNext] = useState(() => !!location.state?.openNext);
  // …both stripped from the history entry, so refreshing the page (which restores
  // location.state) doesn't replay the celebration / re-open the card.
  useEffect(() => {
    if (location.state?.celebrate || location.state?.openNext) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Scrolls the two-page pager back to page 1 (the constellation), where tests are
  // browsed and started — the home of the "take tests" CTAs now that the Tests tab is gone.
  const pagerRef = useRef(null);
  const goToConstellation = () => pagerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const [data, setData] = useState(getCachedPortrait()); // backend response: { status, ... }
  const [loading, setLoading] = useState(!getCachedPortrait());
  const [errored, setErrored] = useState(false);
  const [nonce, setNonce] = useState(0); // bump to refetch
  const [openingChat, setOpeningChat] = useState(false);
  // The Tests list (for the orb info card) + which sigil's card is currently open.
  const [tests, setTests] = useState(getCachedTests());
  const [selectedSigil, setSelectedSigil] = useState(null);
  const selectedTest = selectedSigil ? tests?.find((t) => t.testType === selectedSigil) : null;

  // Load the test list once so tapping an orb can show its info card instantly.
  useEffect(() => { fetchTestsCached().then(setTests).catch(() => {}); }, []);

  // Tapping an orb opens its card; tapping the same orb again closes it.
  const toggleSigil = (type) => setSelectedSigil((cur) => (cur === type ? null : type));

  const startSigilTest = () => {
    const slug = SIGIL_TEST_META[selectedSigil]?.slug;
    if (slug) {
      posthog.capture('test_started', { test_type: selectedSigil, slug });
      navigate(`/tests/${slug}`);
    }
  };
  const viewSigilResult = () => {
    const slug = SIGIL_TEST_META[selectedSigil]?.slug;
    if (slug) navigate(`/tests/${slug}/result`);
  };

  // Open (or resume) the portrait chat and drop the user straight into it.
  const discussWithAi = async () => {
    if (openingChat) return;
    setOpeningChat(true);
    try {
      const chat = await chatApi.openPortrait();
      navigate(`/chat/${chat.id}`, { state: { chat } });
    } catch {
      showToast(t('chat:openError'));
      setOpeningChat(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchPortrait() // a `ready` response is cached inside portraitCache
      .then((r) => {
        if (!active) return;
        setData(r);
        if (r.status === 'ready') posthog.capture('portrait_viewed');
      })
      .catch(() => active && setErrored(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [nonce]);

  // Poll while the server is building or refreshing the portrait.
  useEffect(() => {
    const generating = data?.status === 'generating';
    const refreshing = data?.status === 'ready' && data?.refreshing;
    if (!generating && !refreshing) return;
    const id = setTimeout(() => setNonce((n) => n + 1), POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [data, nonce]);

  // Safe to call from event handlers (not synchronously inside the effect).
  const retry = () => {
    setErrored(false);
    setLoading(true);
    setData(null);
    setNonce((n) => n + 1);
  };

  const content = data?.status === 'ready' ? data.content : null;
  const hasContent = !!content;
  const isRefreshing = hasContent && !!data?.refreshing;
  const isGenerating = data?.status === 'generating';
  const isLocked = data?.status === 'locked';

  // Tests already woven into the portrait — only used as a fallback for
  // `completedTests` below (the constellation orbs light by completion).
  const litBasedOn = hasContent ? (data.basedOn ?? []) : [];
  // Orbs light up by completion (every finished test), not by portrait inclusion —
  // so a finished test's orb shows lit immediately, with no spinner while the AI
  // portrait regenerates in the background.
  const completedTests = data?.completedTests ?? litBasedOn;

  // The selected orb's card mirrors the Tests tab's gate, but read from the SAME
  // completion data that lights the orbs — so a lit orb always offers "View result" and
  // locking follows ring order, instead of a separately-fetched list that can go stale.
  const completedSet = new Set(completedTests);
  // The next test the user should take: the first orb in ring order that isn't done yet.
  // It glows like a completed one so the portrait always shows where to go next.
  const nextTest = SIGIL_LAYOUT.find((s) => !completedSet.has(s.type))?.type ?? null;
  // Segmented progress rings for chunked tests (from the backend's partsCompleted).
  // Shown while in progress, and on the next-up test even at zero (so it reads as
  // "ready"). A finished test lights its orb instead, so it's skipped here.
  const partProgress = {};
  (tests || []).forEach((tst) => {
    const ring = partRingFor(tst, completedSet.has(tst.testType), tst.testType === nextTest);
    if (ring) partProgress[tst.testType] = ring;
  });
  const selectedCompleted = selectedSigil ? completedSet.has(selectedSigil) : false;
  const selectedIdx = selectedSigil ? SIGIL_LAYOUT.findIndex((s) => s.type === selectedSigil) : -1;
  const selectedLocked =
    selectedIdx > 0 && !selectedCompleted &&
    !SIGIL_LAYOUT.slice(0, selectedIdx).every((s) => completedSet.has(s.type));

  // Every "take a/your next test" CTA lands here: scroll home and open the next
  // test's card, so the button is one tap from actually starting — not a dead end
  // at the constellation.
  const openNextTest = () => {
    goToConstellation();
    if (nextTest) setSelectedSigil(nextTest);
  };
  useEffect(() => {
    if (pendingOpenNext && nextTest) {
      setSelectedSigil(nextTest);
      setPendingOpenNext(false);
    }
  }, [pendingOpenNext, nextTest]);

  // The two-page pager appears as soon as we know which tests are done (ready, locked,
  // or a first build in flight). The bare centered screen is only the very first fetch
  // or a hard error with nothing to show.
  const showPager = hasContent || isLocked || isGenerating;
  const showError = !showPager && !loading && (errored || data?.status === 'error');

  // Full-screen, two-page snap pager: page 1 is the constellation alone, centered;
  // a downward swipe locks onto page 2 (the depth panel + the portrait itself).
  // Fixed so it owns the viewport — the dashboard's top bar / bottom nav float over
  // it; `lg:left-64` clears the desktop sidebar.
  return (
    <motion.div
      ref={pagerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg overflow-y-auto overscroll-y-contain snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {showPager ? (
        <>
          {/* Page 1 — the constellation, centered. Tapping an orb opens its test card
              above the star and eases the star down to a single fixed open spot. The card
              is absolutely positioned (out of flow), so its height never moves the star —
              the star has exactly two resting places (centred when closed, one step down
              when ANY card is open), no matter which test or how tall its card. */}
          <section className="relative min-h-[100dvh] snap-start snap-always flex flex-col items-center justify-center px-6">
            {/* Card layer — click-through wrapper so the orbs + swipe gesture stay live;
                only the card itself (pointer-events-auto) catches taps. A COLUMN (not a
                row): while AnimatePresence swaps one card for another, the two stack
                vertically and grow/shrink in place — never slide sideways. */}
            <div className="absolute inset-x-0 top-24 lg:top-12 px-6 flex flex-col items-center pointer-events-none">
              <AnimatePresence>
                {selectedSigil && (
                  <SigilInfoCard
                    key={selectedSigil}
                    type={selectedSigil}
                    test={selectedTest}
                    completed={selectedCompleted}
                    locked={selectedLocked}
                    onStart={startSigilTest}
                    onView={viewSigilResult}
                    onClose={() => setSelectedSigil(null)}
                  />
                )}
              </AnimatePresence>
            </div>

            <motion.div
              className="w-full flex justify-center flex-shrink-0"
              animate={{ y: selectedSigil ? 140 : 0, scale: selectedSigil ? 0.82 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            >
              <PortraitConstellation basedOn={completedTests} nextTest={nextTest} onSelectSigil={toggleSigil} selectedSigil={selectedSigil} partProgress={partProgress} celebrate={celebrate} />
            </motion.div>

            <AnimatePresence>
              {!selectedSigil && (
                <motion.div
                  className="absolute inset-x-0 bottom-24 lg:bottom-10 flex flex-col items-center gap-1.5 text-persona-muted pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: selectedSigil ? 0 : 1.1 }}
                >
                  {/* A touch gesture on mobile, a scroll on desktop — different copy each. */}
                  <span className="text-xs font-medium tracking-wide lg:hidden">{t('swipeDown')}</span>
                  <span className="hidden lg:inline text-xs font-medium tracking-wide">{t('scrollDown')}</span>
                  <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
                    <HiOutlineChevronDown className="w-5 h-5" />
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Page 2 — everything else, locked into place below. Fixed to one screen and
              given its OWN scroll, so the long portrait text scrolls freely inside it
              instead of fighting the outer mandatory snap (which used to make it stick).
              The page turn itself is unchanged — this is still one snap-start screen.
              Generous top/bottom padding clears the floating top bar and bottom nav. */}
          <section className="h-[100dvh] snap-start snap-always overflow-y-auto px-6 pt-24 pb-40 lg:pt-12 lg:pb-16 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto w-full max-w-2xl">
              {hasContent && <PortraitProgress count={data?.basedOn?.length ?? 0} total={TOTAL_TESTS} onTakeTests={openNextTest} />}

              <AnimatePresence mode="wait">
                {hasContent && (
                  <motion.div
                    key={data.updatedAt || 'portrait'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="pt-2 pb-4"
                  >
                    {isRefreshing && (
                      <div className="flex items-center gap-2 text-xs text-persona-muted mb-4">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                          className="inline-flex"
                        >
                          <HiOutlineArrowPath className="w-3.5 h-3.5" />
                        </motion.span>
                        {t('refreshing')}
                      </div>
                    )}
                    {/* The portrait is the product's centerpiece — read it like an essay,
                        not a UI label: the chat's reading serif at essay size, straight on
                        the warm background (no card), same as the compatibility essay. */}
                    <div className="font-reading text-persona-dark [&_p]:text-[17px] [&_p]:leading-[1.75] [&_p]:text-persona-dark/90 [&_p]:mb-5 [&_li]:text-[17px] [&_li]:leading-[1.75] [&_li]:text-persona-dark/90">
                      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
                    </div>

                    {/* Continue the portrait as a conversation with the AI. */}
                    <motion.button
                      onClick={discussWithAi}
                      disabled={openingChat}
                      className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-60"
                      whileTap={{ scale: 0.97 }}
                    >
                      <HiOutlineChatBubbleLeftRight className="w-5 h-5" /> {t('chat:discuss')}
                    </motion.button>
                  </motion.div>
                )}

                {isGenerating && (
                  <motion.div
                    key="building"
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
                      {t('generating')}
                    </span>
                  </motion.div>
                )}

                {isLocked && (
                  <motion.div
                    key="locked"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="surface-warm rounded-4xl px-6 sm:px-8 pt-7 pb-7 text-center max-w-md mx-auto"
                  >
                    <LockedPortraitVignette completedSet={completedSet} nextTest={nextTest} />
                    <h2 className="font-display text-[1.35rem] leading-snug font-semibold text-persona-dark mb-1.5">{t('lockedTitle')}</h2>
                    <p className="text-sm text-persona-muted leading-relaxed max-w-prose mx-auto mb-5">
                      {t('lockedBody')}
                    </p>
                    <ul className="text-left space-y-2.5 max-w-xs mx-auto mb-6">
                      {[
                        { Icon: HiOutlineSparkles, tint: 'bg-persona-accent-lavender/60', key: 'lockedPerk1' },
                        { Icon: HiOutlineLightBulb, tint: 'bg-persona-accent-peach/60', key: 'lockedPerk2' },
                        { Icon: HiOutlineArrowPath, tint: 'bg-persona-accent-lime/60', key: 'lockedPerk3' },
                      ].map(({ Icon, tint, key }) => (
                        <li key={key} className="flex items-start gap-3">
                          <span className={`w-8 h-8 shrink-0 rounded-xl ${tint} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-persona-dark" />
                          </span>
                          <span className="text-sm text-persona-dark/85 leading-relaxed pt-1">{t(key)}</span>
                        </li>
                      ))}
                    </ul>
                    <motion.button onClick={openNextTest} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
                      {completedSet.size === 0 ? t('firstTest') : t('continueTests')}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </>
      ) : (
        // Very first fetch (nothing known yet) or a hard error: a single centered screen.
        <div className="min-h-[100dvh] flex items-center justify-center px-6">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              {!showError && (
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
                    {t('loading')}
                  </span>
                </motion.div>
              )}

              {showError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="surface-warm rounded-4xl p-6"
                >
                  <p className="text-sm text-persona-muted mb-4">{t('error')}</p>
                  <motion.button onClick={retry} className="btn-secondary inline-flex items-center gap-2" whileTap={{ scale: 0.97 }}>
                    <HiOutlineArrowPath className="w-4 h-4" /> {t('common:retry')}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
