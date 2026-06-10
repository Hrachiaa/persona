import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// ECR-R quadrant map. Two subscales on a 1..7 scale:
//   • X axis = Avoidance (left low → right high)
//   • Y axis = Anxiety  (bottom low → top high)
// The user's (avoidance, anxiety) pair is plotted against a cloud of simulated
// "other users" (the population norm), with a dashed crosshair at the norm means.

const MIN = 1;
const MAX = 7;

// Population norms (ECR-R, Fraley parameters). Used to scatter the norm cloud.
const NORM = {
  anxiety: { mean: 3.56, sd: 1.12 },
  avoidance: { mean: 2.96, sd: 1.19 },
  r: 0.35, // correlation between the two subscales
};

const PEERS = 800; // number of simulated other-user points

// Palette tuned to the warm page background.
const C = {
  plot: '#FCFBF9',
  grid: '#E8E5DC',
  border: '#DAD7CE',
  dash: '#B5B2A8',
  tick: '#9B988E',
  quad: '#928E84',
  cloud: '#8E8B82',
  you: '#E2552C',
  youStroke: '#B8401C',
  youGlow: '#FFD2B8',
  title: '#6B7280',
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Small deterministic PRNG (mulberry32) so the scatter is stable across renders.
function makeRng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One standard-normal draw via Box–Muller.
function gauss(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Sample `n` peer points from the bivariate normal defined by the norms, using
// the Cholesky factor of the covariance matrix to correlate the two axes.
function samplePeers(norm, n) {
  const rng = makeRng(0x5eed01);
  const sx = norm.avoidance.sd; // x axis
  const sy = norm.anxiety.sd; // y axis
  const cov = norm.r * sx * sy;

  // Cholesky: [[L11, 0], [L21, L22]]
  const L11 = sx;
  const L21 = cov / sx;
  const L22 = Math.sqrt(sy * sy - L21 * L21);

  const pts = [];
  for (let i = 0; i < n; i++) {
    const z1 = gauss(rng);
    const z2 = gauss(rng);
    pts.push({
      avo: clamp(norm.avoidance.mean + L11 * z1, MIN, MAX),
      anx: clamp(norm.anxiety.mean + L21 * z1 + L22 * z2, MIN, MAX),
    });
  }
  return pts;
}

// SVG geometry. Square plot with symmetric padding so the data center (4, 4)
// sits exactly at the middle of the canvas. Ticks + titles live in the padding.
const W = 360;
const H = 360;
const PAD = { top: 20, right: 20, bottom: 20, left: 20 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;
// Left/right padding as a fraction — used to align the HTML legend to the plot edges.
const EDGE_PCT = (PAD.left / W) * 100;

const toX = (v) => PAD.left + ((clamp(v, MIN, MAX) - MIN) / (MAX - MIN)) * innerW;
const toY = (v) => PAD.top + innerH - ((clamp(v, MIN, MAX) - MIN) / (MAX - MIN)) * innerH;

const TICKS = [1, 2, 3, 4, 5, 6, 7];

// Intro timeline.
const FRAME_MS = 450; // empty plot fades in
const DOTS_DELAY_MS = 50; // dots start shortly after the plot begins appearing
const DOTS_MS = 1200; // gray dots pour in over this window (slow → fast)
const REVEAL_DELAY_MS = 40; // rest of the interface starts fading in together with the graph

// Count of visible dots, animated 0 → target on an ease-in cubic (slow first,
// then accelerating) so the cloud starts sparse and rushes in. Starts only once
// `active` flips true (after the plot has faded in and the beat has passed).
function useDotIntro(target, duration, active) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t ** 4.5;
      setN(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return n;
}

export default function EcrQuadrant({ anxiety, avoidance, norm = NORM, onReady }) {
  const peers = useMemo(() => samplePeers(norm, PEERS), [norm]);

  const x0 = toX(MIN);
  const x1 = toX(MAX);
  const y0 = toY(MAX); // top
  const y1 = toY(MIN); // bottom
  const youX = toX(avoidance);
  const youY = toY(anxiety);

  // Intro: empty plot fades in → beat → dots pour in → "You" lands → the rest.
  const [dotsStarted, setDotsStarted] = useState(false);
  const dotCount = useDotIntro(PEERS, DOTS_MS, dotsStarted);
  const [dotsDone, setDotsDone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });
  useEffect(() => {
    const t0 = setTimeout(() => setDotsStarted(true), DOTS_DELAY_MS);
    const t1 = setTimeout(() => setDotsDone(true), DOTS_DELAY_MS + DOTS_MS);
    const t2 = setTimeout(() => {
      setRevealed(true);
      onReadyRef.current?.();
    }, REVEAL_DELAY_MS);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* plot frame + gridlines — fade in first, on mount */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: FRAME_MS / 1000, ease: 'easeOut' }}>
          <rect x={x0} y={y0} width={innerW} height={innerH} fill={C.plot} stroke={C.border} strokeWidth="1.5" />
          {TICKS.map((t) => (
            <line key={`gx${t}`} x1={toX(t)} y1={y0} x2={toX(t)} y2={y1} stroke={C.grid} strokeWidth="1" />
          ))}
          {TICKS.map((t) => (
            <line key={`gy${t}`} x1={x0} y1={toY(t)} x2={x1} y2={toY(t)} stroke={C.grid} strokeWidth="1" />
          ))}
        </motion.g>

        {/* quadrant labels — fade in once the intro finishes */}
        <motion.g animate={{ opacity: revealed ? 1 : 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <text x={toX(1.3)} y={toY(6.6)} fontSize="12.5" fill={C.quad}>preoccupied</text>
          <text x={toX(6.7)} y={toY(6.6)} fontSize="12.5" fill={C.quad} textAnchor="end">fearful</text>
          <text x={toX(1.3)} y={toY(1.25)} fontSize="12.5" fill={C.quad}>secure</text>
          <text x={toX(6.7)} y={toY(1.25)} fontSize="12.5" fill={C.quad} textAnchor="end">dismissing</text>
        </motion.g>

        {/* norm cloud — simulated results of other users, poured in progressively */}
        <g>
          {peers.slice(0, dotCount).map((p, i) => (
            <circle key={i} cx={toX(p.avo)} cy={toY(p.anx)} r="3" fill={C.cloud} opacity="0.5" />
          ))}
        </g>

        {/* user "You" marker — softly glowing */}
        <defs>
          <filter id="you-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* "You" marker — lands after the gray cloud has finished appearing */}
        {dotsDone && (
          <>
            {/* pulsing glow halo — light, translucent */}
            <motion.circle
              cx={youX}
              cy={youY}
              r="4"
              fill={C.youGlow}
              filter="url(#you-glow)"
              animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.55, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: `${youX}px ${youY}px` }}
            />
            {/* solid dot */}
            <motion.circle
              cx={youX}
              cy={youY}
              r="4"
              fill={C.you}
              stroke={C.youStroke}
              strokeWidth="1.5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              style={{ transformOrigin: `${youX}px ${youY}px` }}
            />
          </>
        )}

        {/* axis titles — pressed to the bottom (x) and left (y), fade in last */}
        <motion.g animate={{ opacity: revealed ? 1 : 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <text x={x0 + innerW / 2} y={y1 + 15} textAnchor="middle" fontSize="12" fill={C.title}>Avoidance →</text>
          <text
            x={9}
            y={y0 + innerH / 2}
            textAnchor="middle"
            fontSize="12"
            fill={C.title}
            transform={`rotate(-90 9 ${y0 + innerH / 2})`}
          >
            Anxiety →
          </text>
        </motion.g>
      </svg>

      {/* Legend — aligned to the plot edges: "You" at the left edge, the gray
          item's text ending at the right edge. */}
      <div
        className="mt-2 flex items-center justify-between transition-opacity duration-[800ms] ease-out"
        style={{ paddingLeft: `${EDGE_PCT}%`, paddingRight: `${EDGE_PCT}%`, opacity: revealed ? 1 : 0 }}
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: C.you }} />
          <span className="font-medium text-persona-dark">You</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-persona-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-persona-muted/40 flex-shrink-0" />
          <span>Other users&apos; results</span>
        </div>
      </div>
    </div>
  );
}
