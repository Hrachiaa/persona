// T-score (μ=50, σ=10) → percentile conversion for the Big Five test,
// plus trait-aware interpretation and a percentile→color mapping that
// stays inside the project's Tailwind token palette.

// Abramowitz & Stegun 7.1.26 approximation of the error function.
export function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x));
  return x >= 0 ? y : -y;
}

export function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function tScoreToPercentile(t) {
  const z = (t - 50) / 10;
  return Math.round(normalCdf(z) * 100);
}

export function percentileBand(p) {
  if (p < 16) return 'low';
  if (p < 36) return 'lowAvg';
  if (p <= 64) return 'avg';
  if (p <= 84) return 'highAvg';
  return 'high';
}

// Returns Tailwind class fragments built on the existing persona.accent tokens.
// `bar` is the filled-bar background, `chip` is a softer pill, `hex` is a
// raw color usable in inline SVG fills.
export function percentileColor(p) {
  const band = percentileBand(p);
  switch (band) {
    case 'low':
      return { bar: 'bg-persona-accent-lavender', chip: 'bg-persona-accent-lavender/40', hex: '#D8B4FE' };
    case 'lowAvg':
      return { bar: 'bg-persona-accent-blue', chip: 'bg-persona-accent-blue/40', hex: '#93C5FD' };
    case 'avg':
      return { bar: 'bg-persona-accent-lime', chip: 'bg-persona-accent-lime/40', hex: '#BEF264' };
    case 'highAvg':
      return { bar: 'bg-persona-accent-yellow', chip: 'bg-persona-accent-yellow/50', hex: '#F0E68C' };
    case 'high':
    default:
      return { bar: 'bg-persona-accent-peach', chip: 'bg-persona-accent-peach/50', hex: '#FDBA74' };
  }
}
