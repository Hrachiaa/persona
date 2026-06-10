import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import { portraitApi } from '../../api/portrait';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';

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
// Each test is a hand-drawn sigil + an accent color (deliberately *not* the
// Tests-tab icon set). Completed tests light up in their color; the rest stay
// ghosted. Assembled radially around a core "self", they form the portrait you
// are slowly revealing.

function GlyphStar({ c }) { // Big Five — the five traits
  return <path d="M0,-11 L2.59,-3.56 L10.46,-3.4 L4.18,1.36 L6.47,8.9 L0,4.4 L-6.47,8.9 L-4.18,1.36 L-10.46,-3.4 L-2.59,-3.56 Z" fill={c} />;
}
function GlyphWheel({ c }) { // Schwartz values — a circumplex wheel
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return <line key={i} x1={Math.cos(a) * 3.2} y1={Math.sin(a) * 3.2} x2={Math.cos(a) * 9} y2={Math.sin(a) * 9} stroke={c} strokeWidth="1.8" strokeLinecap="round" />;
  });
  return <g><circle r="9.5" fill="none" stroke={c} strokeWidth="1.8" />{spokes}</g>;
}
function GlyphWave({ c }) { // COPE — riding the waves
  return (
    <g fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round">
      <path d="M-11,-3 q5.5,-6 11,0 q5.5,6 11,0" />
      <path d="M-11,4 q5.5,-6 11,0 q5.5,6 11,0" />
    </g>
  );
}
function GlyphSpark({ c }) { // IQ — a spark of insight
  return <path d="M0,-11 Q1.6,-1.6 11,0 Q1.6,1.6 0,11 Q-1.6,1.6 -11,0 Q-1.6,-1.6 0,-11 Z" fill={c} />;
}
function GlyphBond({ c }) { // ECR — two souls bound
  return <g fill="none" stroke={c} strokeWidth="2.1"><circle cx="-4.2" cy="0" r="6" /><circle cx="4.2" cy="0" r="6" /></g>;
}
function GlyphFacets({ c }) { // PID — a constellation of facets
  const pts = [[0, -7], [6.4, 4], [-6.4, 4]];
  return (
    <g>
      <path d="M0,-7 L6.4,4 L-6.4,4 Z" fill="none" stroke={c} strokeWidth="1.6" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill={c} />)}
    </g>
  );
}

const SIGILS = {
  bigFive:  { label: 'Personality', color: '#FDBA74', Glyph: GlyphStar },
  shcwartz: { label: 'Values',      color: '#D8B4FE', Glyph: GlyphWheel },
  cope:     { label: 'Stress',      color: '#93C5FD', Glyph: GlyphWave },
  iq:       { label: 'Logic',       color: '#F0E68C', Glyph: GlyphSpark },
  ecr:      { label: 'Attachment',  color: '#FBCFE8', Glyph: GlyphBond },
  pid:      { label: 'Shadows',     color: '#BEF264', Glyph: GlyphFacets },
};

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

// The hero: the symbolic self-portrait. `basedOn` (the tests the portrait is built
// from) drives which orbs are lit; framer tweens the rest so a newly-completed test
// blooms in place when a fresher portrait lands.
function PortraitConstellation({ basedOn }) {
  const done = new Set(basedOn || []);
  const litCount = SIGIL_LAYOUT.filter((s) => done.has(s.type)).length;
  const progress = litCount / SIGIL_LAYOUT.length;

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
            const lit = done.has(s.type);
            return (
              <motion.line
                key={`ray-${s.type}`}
                x1="0" y1="0" x2={s.x} y2={s.y}
                stroke={lit ? SIGILS[s.type].color : '#D8D3C8'}
                strokeWidth={lit ? 2.4 : 1.4}
                strokeDasharray={lit ? '0' : '2 6'}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: lit ? 0.6 : 0.42 }}
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
            const lit = done.has(s.type);
            const { color, label, Glyph } = SIGILS[s.type];
            return (
              <g key={s.type} transform={`translate(${s.x} ${s.y})`}>
                <motion.g
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 220, damping: 18 }}
                >
                  <title>{label} — {lit ? 'revealed' : 'not taken yet'}</title>
                  <motion.circle r="34" fill={color} filter="url(#portraitOrbGlow)" animate={{ opacity: lit ? 0.28 : 0 }} transition={{ duration: 0.6 }} />
                  <motion.circle
                    r="30"
                    strokeWidth="1.5"
                    animate={{ fill: lit ? color : '#ECE9E1', fillOpacity: lit ? 0.95 : 0.5, stroke: lit ? color : '#E0DCD1' }}
                    transition={{ duration: 0.6 }}
                  />
                  <motion.g animate={{ opacity: lit ? 1 : 0.55 }} transition={{ duration: 0.5 }}>
                    <g transform="scale(1.25)">
                      <Glyph c={lit ? '#1A1A1A' : '#A39E92'} />
                    </g>
                  </motion.g>
                </motion.g>
              </g>
            );
          })}
        </g>
      </svg>
    </motion.div>
  );
}

// The "completeness" panel under the hero: a fill bar tied to how many tests the
// portrait is built from, plus copy that promises what the remaining tests unlock.
// Lives *outside* the swap AnimatePresence so the bar animates up in place when a
// richer portrait lands.
function PortraitProgress({ count, total }) {
  const pct = Math.round((count / total) * 100);
  const restPct = 100 - pct;
  const remaining = total - count;

  const motivation =
    remaining === 0
      ? `Drawn from all ${total} tests — this is your complete portrait.`
      : remaining === 1
        ? `Built from ${count} of ${total} tests. One more unlocks the deeper ${restPct}% — the part of you only the last test can reveal.`
        : `Built from ${count} of ${total} tests. ${remaining} more unlock the deeper ${restPct}% — the parts of you only those tests can reveal.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-warm rounded-4xl p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-persona-dark">Portrait depth</span>
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
      <p className="text-xs text-persona-muted leading-relaxed mt-3">{motivation}</p>
    </motion.div>
  );
}

// The portrait tab. Fetches GET /portrait — an AI synthesis of every test the user
// has completed, regenerated server-side whenever a test is submitted. A cached
// portrait is shown immediately; while a newer one is generating we keep the old one
// visible (with a subtle "refreshing" hint) and swap in the fresh version with an
// animation once it's ready. The dry per-test results live on the Tests tab;
// interpretation lives here.
export default function Portrait() {
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

  // Cached content always wins over a transient error — fall back to the old portrait
  // rather than flashing an error if a background refresh fails.
  const showLoading = !hasContent && (loading || data?.status === 'generating');
  const isLocked = !hasContent && !loading && data?.status === 'locked';
  const showError = !hasContent && !loading && !isLocked && (errored || data?.status === 'error');
  const showConstellation = hasContent || isLocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-2 pb-6"
    >
      {/* Hero — the symbolic self-portrait. Persists across content swaps so its
          orbs bloom in place when a richer portrait lands. */}
      {showConstellation && <PortraitConstellation basedOn={hasContent ? data.basedOn : []} />}

      {/* Completeness panel */}
      {hasContent && <PortraitProgress count={data?.basedOn?.length ?? 0} total={TOTAL_TESTS} />}

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

        {showLoading && (
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
              Take your first test to light up the first piece of your portrait above — each test you
              finish reveals another, until the whole picture of you comes together.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
