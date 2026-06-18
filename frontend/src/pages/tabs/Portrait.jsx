import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineClipboardDocumentList, HiOutlineChevronDown } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import { portraitApi } from '../../api/portrait';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';
import { SIGILS } from '../../components/testSigils';

const TOTAL_TESTS = 6;

// One shared in-flight request so StrictMode's double mount reuses a single
// backend call instead of firing two generations.
let inFlight = null;
// Last successful `ready` response, kept at module scope so switching away from the
// tab and back re-renders the existing portrait *instantly* (the tab unmounts on
// switch — see Dashboard.renderTab) while we revalidate in the background.
let cachedData = null;
function fetchPortrait() {
  if (!inFlight) inFlight = portraitApi.getPortrait().finally(() => { inFlight = null; });
  return inFlight;
}

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

// The hero: the symbolic self-portrait. `basedOn` lights orbs; `loadingTests` (tests
// completed but not yet in the portrait — a build is in flight) spin a loading ring.
// When an orb transitions from not-lit to lit (a fresh interpretation landed) it gets
// a one-shot celebratory burst so the moment reads as an event, not a quiet recolor.
function PortraitConstellation({ basedOn, loadingTests }) {
  const litArr = basedOn || [];
  const litSet = new Set(litArr);
  const loadingSet = new Set(loadingTests || []);
  const litCount = litArr.length;
  const progress = litCount / SIGIL_LAYOUT.length;

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
        aria-label={`Your portrait — ${litCount} of ${SIGIL_LAYOUT.length} pieces revealed`}
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
          {/* Rays from the core to each orb */}
          {SIGIL_LAYOUT.map((s) => {
            const lit = litSet.has(s.type);
            return (
              <motion.line
                key={`ray-${s.type}`}
                x1="0" y1="0" x2={s.x} y2={s.y}
                strokeWidth={lit ? 2.4 : 1.4}
                strokeDasharray={lit ? '0' : '2 6'}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ stroke: lit ? SIGILS[s.type].color : '#D8D3C8', opacity: lit ? 0.6 : 0.42 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              />
            );
          })}

          {/* Core "self" — a warm glow that brightens with progress, anchored by λ */}
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

          {/* Orbs — one per test */}
          {SIGIL_LAYOUT.map((s, i) => {
            const lit = litSet.has(s.type);
            const loading = !lit && loadingSet.has(s.type);
            const { color, label, Glyph } = SIGILS[s.type];
            return (
              <g key={s.type} transform={`translate(${s.x} ${s.y})`}>
                <motion.g
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 220, damping: 18 }}
                >
                  <title>{label} — {lit ? 'revealed' : loading ? 'revealing…' : 'not taken yet'}</title>

                  {/* Lit halo */}
                  <motion.circle r="34" fill={color} filter="url(#portraitOrbGlow)" animate={{ opacity: lit ? 0.28 : 0 }} transition={{ duration: 0.6 }} />

                  {/* Orb body */}
                  <motion.circle
                    r="30"
                    strokeWidth="1.5"
                    animate={{ fill: lit ? color : '#ECE9E1', fillOpacity: lit ? 0.95 : 0.5, stroke: lit ? color : loading ? color : '#E0DCD1' }}
                    transition={{ duration: 0.6 }}
                  />

                  {/* Glyph */}
                  <motion.g animate={{ opacity: lit ? 1 : loading ? 0.7 : 0.55 }} transition={{ duration: 0.5 }}>
                    <g transform="scale(1.25)">
                      <Glyph c={lit ? '#1A1A1A' : '#A39E92'} />
                    </g>
                  </motion.g>

                  {/* Loading sweep — a single arc travelling the ring while the AI works */}
                  {loading && (
                    <motion.circle
                      r="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray="50 164"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: -214 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    />
                  )}

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
      </svg>
    </motion.div>
  );
}

// The accuracy panel under the hero: a fill bar tied to how many tests the portrait
// is built from, plus copy that explains *why* more tests mean a truer portrait, and
// a call to take the rest. Lives *outside* the swap AnimatePresence so the bar
// animates up in place when a richer portrait lands.
function PortraitProgress({ count, total, onTakeTests }) {
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
        <span className="text-sm font-medium text-persona-dark">Portrait accuracy</span>
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
          Drawn from all {total} tests — Persona has seen every side of you.
        </p>
      ) : (
        <>
          <p className="text-sm text-persona-muted leading-relaxed mt-4">
            This portrait is built from {count} of {total} tests. With the rest still missing, Persona
            only knows you from one side and has to guess at the others — so it stays on the surface,
            short of the real depth of who you are.
          </p>
          <p className="text-sm text-persona-dark leading-relaxed mt-2 font-medium">
            The more tests you take, the more precisely your portrait describes the real you.
          </p>
          {onTakeTests && (
            <motion.button onClick={onTakeTests} className="btn-primary w-full mt-5" whileTap={{ scale: 0.97 }}>
              Take more tests
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
}

// The portrait tab. Fetches GET /portrait — an AI synthesis of every test the user
// has completed, regenerated server-side whenever a test is submitted. A cached
// portrait is shown immediately; while a newer one is generating we keep the old one
// visible (with a subtle "refreshing" hint) and swap in the fresh version with an
// animation once it's ready. The dry per-test results live on the Tests tab;
// interpretation lives here.
export default function Portrait({ onOpenTests }) {
  const [data, setData] = useState(cachedData); // backend response: { status, ... }
  const [loading, setLoading] = useState(!cachedData);
  const [errored, setErrored] = useState(false);
  const [nonce, setNonce] = useState(0); // bump to refetch

  useEffect(() => {
    let active = true;
    fetchPortrait()
      .then((r) => {
        if (!active) return;
        setData(r);
        if (r.status === 'ready') cachedData = r; // survive remounts within the session
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

  // Which orbs light up vs. spin a loading ring. `completedTests` (every finished
  // test) is a superset of `basedOn` (tests already in the portrait) while a build is
  // in flight — the difference is what's currently "revealing".
  const litBasedOn = hasContent ? (data.basedOn ?? []) : [];
  const completedTests = data?.completedTests ?? litBasedOn;
  const buildingActive = isGenerating || isRefreshing;
  const loadingTests = buildingActive ? completedTests.filter((t) => !litBasedOn.includes(t)) : [];

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg overflow-y-auto overscroll-y-contain snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {showPager ? (
        <>
          {/* Page 1 — the constellation, centered, alone */}
          <section className="relative min-h-[100dvh] snap-start snap-always flex items-center justify-center px-6">
            <PortraitConstellation basedOn={litBasedOn} loadingTests={loadingTests} />

            <motion.div
              className="absolute inset-x-0 bottom-24 lg:bottom-10 flex flex-col items-center gap-1.5 text-persona-muted pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              <span className="text-xs font-medium tracking-wide">Swipe down for your portrait</span>
              <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
                <HiOutlineChevronDown className="w-5 h-5" />
              </motion.span>
            </motion.div>
          </section>

          {/* Page 2 — everything else, locked into place below. Fixed to one screen and
              given its OWN scroll, so the long portrait text scrolls freely inside it
              instead of fighting the outer mandatory snap (which used to make it stick).
              The page turn itself is unchanged — this is still one snap-start screen.
              Generous top/bottom padding clears the floating top bar and bottom nav. */}
          <section className="h-[100dvh] snap-start snap-always overflow-y-auto px-6 pt-24 pb-40 lg:pt-12 lg:pb-16 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto w-full max-w-2xl">
              {hasContent && <PortraitProgress count={data?.basedOn?.length ?? 0} total={TOTAL_TESTS} onTakeTests={onOpenTests} />}

              <AnimatePresence mode="wait">
                {hasContent && (
                  <motion.div
                    key={data.updatedAt || 'portrait'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="surface-warm rounded-4xl p-6"
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
                        Refreshing your portrait with your latest test…
                      </div>
                    )}
                    <div className="text-persona-dark">
                      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
                    </div>
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
                      Drawing your portrait from your tests… the orb above will light up the moment it&apos;s ready.
                    </span>
                  </motion.div>
                )}

                {isLocked && (
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
                      Take your first test to light up the first piece of your portrait — each test you
                      finish reveals another, until the whole picture of you comes together.
                    </p>
                    {onOpenTests && (
                      <motion.button onClick={onOpenTests} className="btn-primary mt-6" whileTap={{ scale: 0.97 }}>
                        Take your first test
                      </motion.button>
                    )}
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
                    Building your portrait from your tests… this can take up to a minute.
                  </span>
                </motion.div>
              )}

              {showError && (
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
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
