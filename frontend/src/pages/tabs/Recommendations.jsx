import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  HiOutlineBookOpen,
  HiOutlineFilm,
  HiOutlineHeart,
  HiOutlineXMark,
  HiOutlineInformationCircle,
  HiOutlineArrowPath,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { recommendationsApi } from '../../api/recommendations';

const MODES = [
  { id: 'film', label: 'Films', icon: HiOutlineFilm },
  { id: 'book', label: 'Books', icon: HiOutlineBookOpen },
];

const TOTAL_TESTS = 6;
const LOW_WATER = 7; // keep the queue topped up once it drops to this many cards (matches backend)
const POLL_INTERVAL_MS = 3500; // how often to check for a freshly generated batch
const SWIPE_THRESHOLD = 100; // px drag past which a release counts as a swipe

// Per-mode set of ids the user has already swiped this session. Guards the merge
// on refetch: a card we optimistically removed must not reappear if the server
// still lists it as PENDING (its swipe POST may be mid-flight). Module scope so it
// survives the tab unmounting on every dashboard switch.
const swiped = { film: new Set(), book: new Set() };

const swipeVariants = {
  enter: { scale: 0.95, y: 12, opacity: 1 },
  center: { scale: 1, y: 0, opacity: 1 },
  exit: (dir) => ({
    x: dir === 'LIKED' ? 640 : -640,
    rotate: dir === 'LIKED' ? 18 : -18,
    opacity: 0,
    transition: { duration: 0.32, ease: 'easeOut' },
  }),
};

// ─── The draggable top card ──────────────────────────────────────────────────
function SwipeCard({ item, custom, onSwipe, onInfo }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [40, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-130, -40], [1, 0]);
  // Distinguishes a tap (opens the synopsis) from a drag (a swipe shouldn't).
  const dragged = useRef(false);

  const meta = item.mediaType === 'film' ? item.year : item.author;

  return (
    <motion.div
      className="absolute inset-0 cursor-pointer active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      whileTap={{ scale: 0.98 }}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onSwipe('LIKED');
        else if (info.offset.x < -SWIPE_THRESHOLD) onSwipe('DISLIKED');
      }}
      onClick={() => {
        if (dragged.current) { dragged.current = false; return; }
        onInfo(item);
      }}
      variants={swipeVariants}
      custom={custom}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <div className="relative w-full h-full rounded-4xl overflow-hidden shadow-warm-lg bg-persona-line select-none">
        <img
          src={item.posterUrl}
          alt={item.title}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        {/* readability gradient for the caption + the overlaid controls */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {/* LIKE / NOPE stamps driven by drag distance */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-7 left-6 -rotate-12 border-[3px] border-emerald-400 text-emerald-400 rounded-xl px-3 py-1 text-2xl font-extrabold tracking-wider"
        >
          LIKE
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-7 right-6 rotate-12 border-[3px] border-rose-500 text-rose-500 rounded-xl px-3 py-1 text-2xl font-extrabold tracking-wider"
        >
          NOPE
        </motion.div>

        <div className="absolute inset-x-0 bottom-24 px-6 text-white pointer-events-none">
          <h3 className="font-display text-2xl font-semibold leading-tight drop-shadow">{item.title}</h3>
          {meta && <p className="text-sm text-white/85 mt-1 tabular">{meta}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// A static card sitting behind the top one, scaled down for depth.
function BackgroundCard({ item, depth }) {
  return (
    <div
      className="absolute inset-0"
      style={{ transform: `scale(${1 - depth * 0.05}) translateY(${depth * 12}px)`, zIndex: -depth }}
    >
      <div className="relative w-full h-full rounded-4xl overflow-hidden shadow-warm bg-persona-line">
        <img src={item.posterUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
}

function ActionButton({ onClick, children, className = '', size = 'md', label }) {
  const dim = size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      whileHover={{ y: -2 }}
      className={`${dim} rounded-full bg-white shadow-warm-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${className}`}
    >
      {children}
    </motion.button>
  );
}

export default function Recommendations({ onOpenTests }) {
  const [mode, setMode] = useState('film');
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | locked | generating | ready | error
  const [lockInfo, setLockInfo] = useState({ completed: 0, required: TOTAL_TESTS });
  const [generatingMore, setGeneratingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [dir, setDir] = useState(null); // last swipe direction — drives the exit animation
  const [info, setInfo] = useState(null); // item whose synopsis modal is open
  const [confirmReset, setConfirmReset] = useState(false);
  const [pollTick, setPollTick] = useState(0);

  const loadedModeRef = useRef(null);

  // Load (mode switch) / refresh (poll) the queue. On a mode switch we replace the
  // stack; on a poll for the same mode we merge in any freshly generated cards.
  useEffect(() => {
    let active = true;
    const type = mode;
    const merge = loadedModeRef.current === type;

    recommendationsApi
      .get(type)
      .then((resp) => {
        if (!active) return;
        loadedModeRef.current = type;

        if (resp.status === 'locked') {
          setStatus('locked');
          setLockInfo({ completed: resp.completed ?? 0, required: resp.required ?? TOTAL_TESTS });
          return;
        }
        if (resp.status === 'generating') {
          setStatus('generating');
          setGeneratingMore(true);
          if (!merge) setCards([]);
          return;
        }
        // ready
        setStatus('ready');
        setGeneratingMore(!!resp.generating);
        const visible = (resp.items || []).filter((i) => !swiped[type].has(i.id));
        setCards((prev) => {
          const base = merge ? prev : [];
          const have = new Set(base.map((c) => c.id));
          const next = [...base, ...visible.filter((i) => !have.has(i.id))];
          // Nothing left and the server isn't building more — stop the refill poll.
          if (!resp.generating && next.length === 0) setExhausted(true);
          return next;
        });
      })
      .catch(() => active && setStatus((s) => (s === 'ready' ? s : 'error')));

    return () => { active = false; };
  }, [mode, pollTick]);

  // Keep the queue topped up: poll while building, or while the local stack is low.
  // `needMore` is a boolean dependency on purpose — swiping changes cards.length but
  // not *whether* we still need more, so it doesn't re-run this effect and reset the
  // pending timer. (Depending on cards.length directly meant fast swiping perpetually
  // cleared the timeout, so the fetch only fired once the stack hit zero.)
  const needMore = !exhausted && (status === 'generating' || (status === 'ready' && cards.length <= LOW_WATER));
  useEffect(() => {
    if (!needMore) return;
    const id = setTimeout(() => setPollTick((t) => t + 1), POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [needMore, pollTick]);

  function selectMode(next) {
    if (next === mode) return;
    setMode(next);
    setStatus('loading');
    setCards([]);
    setExhausted(false);
    setGeneratingMore(false);
  }

  function doSwipe(verdict) {
    const card = cards[0];
    if (!card) return;
    setDir(verdict);
    swiped[mode].add(card.id);
    setExhausted(false);
    setInfo(null);
    setCards((prev) => prev.slice(1));
    recommendationsApi.swipe(card.id, verdict).catch(() => {});
  }

  function handleReset() {
    setConfirmReset(false);
    swiped[mode] = new Set();
    setCards([]);
    setExhausted(false);
    setStatus('generating');
    setGeneratingMore(true);
    recommendationsApi
      .reset(mode)
      .then(() => setPollTick((t) => t + 1))
      .catch(() => setStatus('error'));
  }

  // ─── Locked: tests not all done ────────────────────────────────────────────
  if (status === 'locked') {
    const { completed, required } = lockInfo;
    const pct = Math.round((completed / required) * 100);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 lg:left-64 z-30 bg-persona-bg flex items-center justify-center px-6 pt-20 pb-24 lg:py-6">
        <div className="surface-warm rounded-4xl p-8 text-center max-w-md w-full">
          <div className="w-14 h-14 mx-auto mb-4 bg-persona-accent-lime/60 rounded-3xl flex items-center justify-center">
            <HiOutlineSparkles className="w-7 h-7 text-persona-dark" />
          </div>
          <h2 className="font-display text-xl font-semibold text-persona-dark mb-1.5">Recommendations are locked</h2>
          <p className="text-sm text-persona-muted leading-relaxed mb-5">
            Finish all {required} tests and Persona will hand-pick films and books for you — then you just
            swipe right on what you like and left on what you don&apos;t.
          </p>
          <div className="relative h-2.5 bg-persona-line/60 rounded-full overflow-hidden mb-2">
            <motion.div className="absolute inset-y-0 left-0 bg-persona-accent-lime rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
          <p className="text-xs text-persona-muted mb-6 tabular">{completed} of {required} tests done</p>
          {onOpenTests && (
            <motion.button onClick={onOpenTests} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
              {completed === 0 ? 'Take your first test' : 'Continue your tests'}
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  const empty = cards.length === 0;
  const busy = status === 'loading' || status === 'generating' || (empty && generatingMore);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 lg:left-64 z-30 bg-persona-bg">
      {/* Padded so the poster clears the dashboard's top bar (mobile) and bottom nav. */}
      <div className="absolute inset-0 px-3 pt-[5.25rem] pb-[5.75rem] lg:px-6 lg:py-6">
        <div className="relative w-full h-full max-w-md mx-auto">
          {/* Poster / state fill */}
          {status === 'error' ? (
            <div className="absolute inset-0 surface-warm rounded-4xl flex flex-col items-center justify-center text-center p-8">
              <p className="text-sm text-persona-muted mb-4">Couldn&apos;t load recommendations right now.</p>
              <motion.button onClick={() => { loadedModeRef.current = null; setPollTick((t) => t + 1); }} className="btn-secondary inline-flex items-center gap-2" whileTap={{ scale: 0.97 }}>
                <HiOutlineArrowPath className="w-4 h-4" /> Try again
              </motion.button>
            </div>
          ) : busy ? (
            <div className="absolute inset-0 surface-warm rounded-4xl flex flex-col items-center justify-center text-center p-8">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }} className="inline-flex mb-4 text-persona-muted">
                <HiOutlineArrowPath className="w-7 h-7" />
              </motion.span>
              <p className="text-sm text-persona-muted leading-relaxed max-w-xs">
                {status === 'loading' ? 'Loading your picks…' : `Hand-picking ${mode === 'film' ? 'films' : 'books'} for you — this can take a moment.`}
              </p>
            </div>
          ) : empty ? (
            <div className="absolute inset-0 surface-warm rounded-4xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 mb-3 bg-persona-accent-peach/50 rounded-2xl flex items-center justify-center">
                <HiOutlineSparkles className="w-6 h-6 text-persona-dark" />
              </div>
              <p className="text-sm text-persona-dark font-medium mb-1">You&apos;re all caught up</p>
              <p className="text-sm text-persona-muted leading-relaxed max-w-xs">
                We&apos;re out of fresh picks for now. Reset to start over, or check back soon.
              </p>
            </div>
          ) : (
            <>
              {cards.slice(1, 3).map((c, i) => (
                <BackgroundCard key={c.id} item={c} depth={i + 1} />
              ))}
              <AnimatePresence custom={dir}>
                <SwipeCard key={cards[0].id} item={cards[0]} custom={dir} onSwipe={doSwipe} onInfo={setInfo} />
              </AnimatePresence>
            </>
          )}

          {/* Films / Books — floating on the poster */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex p-1 bg-white/85 backdrop-blur-md rounded-full shadow-warm-lg">
            {MODES.map((m) => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => selectMode(m.id)}
                  className={`relative flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-colors ${isActive ? 'text-persona-dark' : 'text-persona-muted hover:text-persona-dark'}`}
                >
                  {isActive && <motion.div layoutId="recoModePill" className="absolute inset-0 bg-white shadow-warm rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <m.icon className="relative w-4 h-4" />
                  <span className="relative">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Action bar — floating on the poster */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-3.5">
            <ActionButton onClick={() => setConfirmReset(true)} size="md" label="Reset recommendations" className="text-persona-muted hover:text-persona-dark">
              <HiOutlineArrowPath className="w-5 h-5" />
            </ActionButton>
            <ActionButton onClick={() => doSwipe('DISLIKED')} size="lg" label="Dislike" className="text-rose-500">
              <HiOutlineXMark className="w-8 h-8" />
            </ActionButton>
            <ActionButton onClick={() => cards[0] && setInfo(cards[0])} size="md" label="Details" className="text-persona-accent-blue">
              <HiOutlineInformationCircle className="w-6 h-6" />
            </ActionButton>
            <ActionButton onClick={() => doSwipe('LIKED')} size="lg" label="Like" className="text-emerald-500">
              <HiOutlineHeart className="w-8 h-8" />
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Synopsis modal */}
      <AnimatePresence>
        {info && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setInfo(null)}
          >
            <motion.div
              className="surface-warm rounded-4xl p-6 w-full max-w-md max-h-[80dvh] overflow-y-auto"
              initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-4">
                <img src={info.posterUrl} alt="" className="w-20 h-28 object-cover rounded-xl shadow-warm shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-semibold text-persona-dark leading-tight">{info.title}</h3>
                  <p className="text-sm text-persona-muted mt-1 tabular">{info.mediaType === 'film' ? info.year : info.author}</p>
                </div>
              </div>
              <p className="text-sm text-persona-dark/90 leading-relaxed">
                {info.synopsis || 'No description available for this title.'}
              </p>
              <button onClick={() => setInfo(null)} className="btn-secondary w-full mt-6">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset confirmation */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmReset(false)}
          >
            <motion.div
              className="surface-warm rounded-4xl p-6 w-full max-w-sm text-center"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 mx-auto mb-4 bg-rose-100 rounded-2xl flex items-center justify-center">
                <HiOutlineArrowPath className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="font-display text-lg font-semibold text-persona-dark mb-1.5">Reset {mode === 'film' ? 'films' : 'books'}?</h3>
              <p className="text-sm text-persona-muted leading-relaxed mb-6">
                This clears your entire like/dislike history and watch list for {mode === 'film' ? 'films' : 'books'}.
                Persona will start picking from scratch based on your profile. This can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmReset(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleReset} className="flex-1 rounded-full bg-rose-500 text-white font-medium py-2.5 px-4 hover:bg-rose-600 transition-colors">
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
