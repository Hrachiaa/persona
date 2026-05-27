import { motion } from 'framer-motion';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import { tScoreToPercentile, interpretTrait, percentileColor } from '../../utils/tScore.js';

// O at top, going clockwise → C → E → A → N (the OCEAN acronym order)
const TRAIT_AXES = [
  { key: 'O', short: 'O', long: 'Openness' },
  { key: 'C', short: 'C', long: 'Conscientiousness' },
  { key: 'E', short: 'E', long: 'Extraversion' },
  { key: 'A', short: 'A', long: 'Agreeableness' },
  { key: 'N', short: 'N', long: 'Neuroticism' },
];

// Facet keys map to backend result keys (E1..E6, A1..A6, etc.).
const FACET_KEYS = {
  O: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'],
  C: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
  E: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
  A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  N: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
};

// ─── Radar / spider chart ────────────────────────────────────────────────────
function BigFiveRadar({ percentiles }) {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const R = 120; // outer radius for 100th percentile

  // Vertex i angle: -90° (top) + i * 72°, in radians, going clockwise.
  const angleFor = (i) => (-Math.PI / 2) + i * ((2 * Math.PI) / 5);

  const pointAt = (i, radius) => {
    const a = angleFor(i);
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  };

  const ringPath = (r) => {
    return TRAIT_AXES.map((_, i) => {
      const { x, y } = pointAt(i, r);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ') + ' Z';
  };

  // User's polygon — vertex at (percentile/100) * R along each axis.
  const userVertices = TRAIT_AXES.map((trait, i) => {
    const p = percentiles[trait.key] ?? 0;
    return { ...pointAt(i, (p / 100) * R), trait, percentile: p };
  });
  const userPath =
    userVertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ') + ' Z';

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-md mx-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Big Five percentile radar"
      >
        <defs>
          <radialGradient id="bigFiveFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        {/* Concentric rings */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
          <path
            key={f}
            d={ringPath(R * f)}
            fill="none"
            stroke="#E8E5DC"
            strokeWidth={f === 1 ? 1.5 : 1}
          />
        ))}

        {/* Axis lines */}
        {TRAIT_AXES.map((_, i) => {
          const end = pointAt(i, R);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="#E8E5DC"
              strokeWidth="1"
            />
          );
        })}

        {/* User polygon */}
        <motion.path
          d={userPath}
          fill="url(#bigFiveFill)"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Vertex dots */}
        {userVertices.map((v, i) => {
          const c = percentileColor(v.percentile);
          return (
            <motion.circle
              key={v.trait.key}
              cx={v.x}
              cy={v.y}
              r="6"
              fill={c.hex}
              stroke="#1A1A1A"
              strokeWidth="1.5"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 + i * 0.07, type: 'spring', stiffness: 200 }}
            />
          );
        })}

        {/* Axis labels — placed just outside the outer ring */}
        {TRAIT_AXES.map((trait, i) => {
          const labelPt = pointAt(i, R + 26);
          const pct = percentiles[trait.key] ?? 0;
          return (
            <g key={trait.key}>
              <text
                x={labelPt.x}
                y={labelPt.y - 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#1A1A1A"
                style={{ fontFamily: 'Geist, Inter, sans-serif', letterSpacing: '0.04em' }}
              >
                {trait.long.toUpperCase()}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 11}
                textAnchor="middle"
                fontSize="11"
                fill="#6B7280"
                style={{ fontFamily: 'Geist, Inter, sans-serif', fontVariantNumeric: 'tabular-nums' }}
              >
                {pct}
                <tspan fontSize="8" dy="-3" dx="1">th</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Facet bar row ───────────────────────────────────────────────────────────
function FacetRow({ name, percentile, delay }) {
  const color = percentileColor(percentile);
  return (
    <motion.div
      className="flex items-center gap-3 py-2"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <span className="text-sm text-persona-dark/80 w-36 sm:w-44 flex-shrink-0">{name}</span>
      <div className="flex-1 h-2.5 bg-persona-line/60 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color.bar} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentile}%` }}
          transition={{ duration: 0.7, delay, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm font-medium text-persona-dark tabular w-9 text-right flex-shrink-0">
        {percentile}
      </span>
    </motion.div>
  );
}

// ─── Per-trait facet group ───────────────────────────────────────────────────
function FacetGroup({ trait, traitPercentile, facets, delay }) {
  const interp = interpretTrait(traitPercentile, trait.key);
  const color = percentileColor(traitPercentile);

  return (
    <motion.section
      className="surface-warm rounded-3xl p-5 sm:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">
            {trait.long}
          </h3>
          <p className="text-sm text-persona-muted mt-1 leading-snug">
            You are <span className="text-persona-dark font-medium">{interp.oneLiner}</span>.
          </p>
        </div>
        <div className={`${color.chip} rounded-2xl px-3 py-2 text-right flex-shrink-0`}>
          <div className="font-display text-2xl font-semibold text-persona-dark tabular leading-none">
            {traitPercentile}
            <span className="text-sm align-top ml-0.5">th</span>
          </div>
          <div className="text-[10px] tracking-wide text-persona-dark/70 uppercase mt-1">
            {interp.label}
          </div>
        </div>
      </header>

      <div className="divide-y divide-persona-line/60">
        {facets.map((f, i) => (
          <FacetRow
            key={f.key}
            name={f.name}
            percentile={f.percentile}
            delay={delay + 0.05 + i * 0.04}
          />
        ))}
      </div>
    </motion.section>
  );
}

// ─── Main result screen ──────────────────────────────────────────────────────
export default function BigFiveResultScreen({ result, meta, onDone, onRetake }) {
  const r = result?.result || {};
  const Icon = meta.icon;

  // Convert every T-score to a percentile up-front.
  const traitPct = {};
  for (const t of TRAIT_AXES) {
    traitPct[t.key] = tScoreToPercentile(r[t.key]?.score ?? 50);
  }

  const facetsByTrait = {};
  for (const t of TRAIT_AXES) {
    facetsByTrait[t.key] = FACET_KEYS[t.key].map((k) => ({
      key: k,
      name: r[k]?.name ?? k,
      percentile: tScoreToPercentile(r[k]?.score ?? 50),
    }));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-6 pt-8 pb-12"
    >
      {/* Hero */}
      <div className="text-center mb-6">
        <motion.div
          className={`w-20 h-20 ${meta.color} rounded-[1.75rem] flex items-center justify-center mx-auto mb-5`}
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <Icon className={`w-10 h-10 ${meta.iconColor}`} />
        </motion.div>
        <h2 className="font-display text-3xl font-semibold text-persona-dark mb-2">
          Your Big Five profile
        </h2>
        <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
          Each axis shows how you compare to other people — the further from the center, the higher
          you scored. Hover over the facets below for the detail behind each trait.
        </p>
      </div>

      {/* Radar */}
      <motion.div
        className="surface-warm rounded-[2rem] p-4 sm:p-6 mb-8"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 160, damping: 18 }}
      >
        <BigFiveRadar percentiles={traitPct} />
      </motion.div>

      {/* Facet groups */}
      <div className="grid gap-4 mb-10">
        {TRAIT_AXES.map((trait, i) => (
          <FacetGroup
            key={trait.key}
            trait={trait}
            traitPercentile={traitPct[trait.key]}
            facets={facetsByTrait[trait.key]}
            delay={0.3 + i * 0.08}
          />
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto">
        <motion.button
          onClick={onDone}
          className="btn-primary w-full"
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Done
        </motion.button>
        <motion.button
          onClick={onRetake}
          className="text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1.5 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-2 py-1"
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <HiOutlineArrowPath className="w-4 h-4" /> Retake test
        </motion.button>
      </div>
    </motion.div>
  );
}
