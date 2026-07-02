/* eslint-disable react-refresh/only-export-components -- static sigil glyphs + data, no stateful components; fast-refresh isn't relevant here */
// The portrait's symbolic language: each test is a sigil + accent color. Shared
// between the Portrait constellation and the friend's results list so both speak the
// same visual vocabulary. Most glyphs are hand-drawn on a ~[-11,11] canvas centered
// at the origin (meant to sit inside an SVG, scaled up ~1.25x). The lightbulb is
// auto-traced from artwork in src/assets (see glyphPaths.js) and re-fitted to the
// same canvas by `tracedGlyph` below.
import { BULB_GLYPH } from './glyphPaths';

// Render a potrace-traced path (its own square viewBox) onto the shared [-11,11]
// canvas: centre it and scale its viewBox to span `size` units, recoloured via
// `fill`. The hand-drawn sigils sit ~±11 (size 22); the traced artwork reads better
// a touch larger, so it's bumped up.
function tracedGlyph({ vb, d }, c, size = 28) {
  return (
    <g transform={`scale(${size / vb}) translate(${-vb / 2} ${-vb / 2})`}>
      <path fill={c} fillRule="evenodd" d={d} />
    </g>
  );
}

function GlyphStar({ c }) { // Personality — the five traits
  return <path d="M0,-11 L2.59,-3.56 L10.46,-3.4 L4.18,1.36 L6.47,8.9 L0,4.4 L-6.47,8.9 L-4.18,1.36 L-10.46,-3.4 L-2.59,-3.56 Z" fill={c} />;
}
function GlyphScale({ c }) { // Values — the scales of judgement (matches the Tests screen icon)
  return (
    <g transform="scale(0.92) translate(-12 -12)" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
    </g>
  );
}
function GlyphWave({ c }) { // COPE — riding the waves of stress
  return (
    <g fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round">
      <path d="M-11,-3 q5.5,-6 11,0 q5.5,6 11,0" />
      <path d="M-11,4 q5.5,-6 11,0 q5.5,6 11,0" />
    </g>
  );
}
function GlyphBulb({ c }) { // IQ — a radiating lightbulb (traced from artwork)
  return tracedGlyph(BULB_GLYPH, c, 36);
}
function GlyphBond({ c }) { // ECR — two souls bound
  return <g fill="none" stroke={c} strokeWidth="2.1"><circle cx="-4.2" cy="0" r="6" /><circle cx="4.2" cy="0" r="6" /></g>;
}
function GlyphMoon({ c }) { // PID — the hidden, shadowed self (a crescent moon)
  // A single lune (outer major arc + inner arc meeting at the two cusps), so there's
  // no stray sliver — unlike the old two-circle even-odd cut, whose inner circle poked
  // past the outer edge and got filled as a second crescent on the right.
  return <path fill={c} d="M3.51,8.29 A9,9 0 1 1 3.51,-8.29 A8.3,8.3 0 0 0 3.51,8.29 Z" />;
}

export const SIGILS = {
  bigFive:  { label: 'Personality', color: '#FDBA74', Glyph: GlyphStar },
  shcwartz: { label: 'Values',      color: '#D8B4FE', Glyph: GlyphScale },
  cope:     { label: 'Stress',      color: '#93C5FD', Glyph: GlyphWave },
  iq:       { label: 'Logic',       color: '#F0E68C', Glyph: GlyphBulb },
  ecr:      { label: 'Attachment',  color: '#FBCFE8', Glyph: GlyphBond },
  pid:      { label: 'Shadows',     color: '#BEF264', Glyph: GlyphMoon },
};
