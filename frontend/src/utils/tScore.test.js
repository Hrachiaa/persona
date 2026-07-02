import { describe, it, expect } from 'vitest';
import {
  erf,
  normalCdf,
  tScoreToPercentile,
  percentileBand,
  percentileColor,
} from './tScore.js';

describe('erf', () => {
  it('returns 0 at 0', () => {
    expect(erf(0)).toBeCloseTo(0, 6);
  });
  it('is odd', () => {
    expect(erf(-1)).toBeCloseTo(-erf(1), 6);
  });
  it('approaches 1 for large x', () => {
    expect(erf(3)).toBeGreaterThan(0.999);
  });
});

describe('normalCdf', () => {
  it('is 0.5 at z=0', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });
  it('is ~0.8413 at z=1 (one SD above mean)', () => {
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3);
  });
  it('is ~0.1587 at z=-1', () => {
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });
});

describe('tScoreToPercentile — anchors', () => {
  it('T=50 → 50th percentile (exact average)', () => {
    expect(tScoreToPercentile(50)).toBe(50);
  });
  it('T=60 → ~84th percentile (one SD above)', () => {
    expect(tScoreToPercentile(60)).toBe(84);
  });
  it('T=40 → ~16th percentile (one SD below)', () => {
    expect(tScoreToPercentile(40)).toBe(16);
  });
  it('T=70 → ~98th percentile (two SDs above)', () => {
    expect(tScoreToPercentile(70)).toBe(98);
  });
  it('T=30 → ~2nd percentile (two SDs below)', () => {
    expect(tScoreToPercentile(30)).toBe(2);
  });
  it('extreme low T saturates near 0', () => {
    expect(tScoreToPercentile(10)).toBeLessThanOrEqual(1);
  });
  it('extreme high T saturates near 100', () => {
    expect(tScoreToPercentile(90)).toBeGreaterThanOrEqual(99);
  });
});

describe('percentileBand', () => {
  it('classifies the five bands at their boundaries', () => {
    expect(percentileBand(0)).toBe('low');
    expect(percentileBand(15)).toBe('low');
    expect(percentileBand(16)).toBe('lowAvg');
    expect(percentileBand(50)).toBe('avg');
    expect(percentileBand(64)).toBe('avg');
    expect(percentileBand(65)).toBe('highAvg');
    expect(percentileBand(84)).toBe('highAvg');
    expect(percentileBand(85)).toBe('high');
    expect(percentileBand(100)).toBe('high');
  });
});

describe('percentileColor', () => {
  it('returns the five distinct token bars across the gradient', () => {
    const bars = new Set([5, 25, 50, 75, 95].map((p) => percentileColor(p).bar));
    expect(bars.size).toBe(5);
  });
  it('low → lavender, high → peach', () => {
    expect(percentileColor(5).bar).toContain('lavender');
    expect(percentileColor(95).bar).toContain('peach');
  });
});
