// Progressive ("gradient") blur — stacks several backdrop-blur layers, each with
// a larger radius and a mask that fades out at a different depth. Because every
// layer fades linearly (black → transparent) and the radii overlap, the combined
// blur ramps down smoothly from the edge to nothing, with no hard seam where it
// "ends". Give the strip a generous height (taller than the bar it sits behind)
// so the tail of the fade lands well inside the scrolling content.
//
// `direction` picks which edge stays sharp: 'down' keeps the bottom clear (blur
// strongest at top), 'up' keeps the top clear.
const LAYERS = [
  { blur: 0.5, fade: '20%' },
  { blur: 1, fade: '42%' },
  { blur: 2, fade: '68%' },
  { blur: 4, fade: '100%' },
];

export default function ProgressiveBlur({ direction = 'down', className = '' }) {
  const to = direction === 'down' ? 'to bottom' : 'to top';
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      {LAYERS.map((l) => {
        const mask = `linear-gradient(${to}, black, transparent ${l.fade})`;
        return (
          <div
            key={l.blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${l.blur}px)`,
              WebkitBackdropFilter: `blur(${l.blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}
