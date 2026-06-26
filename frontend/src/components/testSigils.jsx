/* eslint-disable react-refresh/only-export-components -- static sigil glyphs + data, no stateful components; fast-refresh isn't relevant here */
// The portrait's symbolic language: each test is a hand-drawn sigil + accent color.
// Shared between the Portrait constellation and the friend's results list so both
// speak the same visual vocabulary. The glyphs are authored on a ~[-11,11] canvas
// centered at the origin (meant to sit inside an SVG, scaled up ~1.25x).

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

export const SIGILS = {
  bigFive:  { label: 'Personality', color: '#FDBA74', Glyph: GlyphStar },
  shcwartz: { label: 'Values',      color: '#D8B4FE', Glyph: GlyphWheel },
  cope:     { label: 'Stress',      color: '#93C5FD', Glyph: GlyphWave },
  iq:       { label: 'Logic',       color: '#F0E68C', Glyph: GlyphSpark },
  ecr:      { label: 'Attachment',  color: '#FBCFE8', Glyph: GlyphBond },
  pid:      { label: 'Shadows',     color: '#BEF264', Glyph: GlyphFacets },
};
