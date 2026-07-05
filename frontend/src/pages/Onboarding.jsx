import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi2';
import posthog from 'posthog-js';
import { SIGILS } from '../components/testSigils';

const INK = 'rgba(26,26,26,0.72)';

/* ------------------------------------------------------------------ */
/* One continuous scene instead of four separate slides: the six test  */
/* sigils are persistent actors that morph between per-step positions  */
/* (constellation → portrait header → two compatibility cards → the    */
/* AI's "memory strip" in a chat). Copy crossfades below the canvas.   */
/* ------------------------------------------------------------------ */

// Left-to-right order used when the sigils line up in rows.
const CAST = ['bigFive', 'shcwartz', 'iq', 'ecr', 'pid', 'cope'];

// Per-step targets for every sigil: center position in % of the canvas,
// size in px, rotation in deg. Row positions are tuned to land on the
// overlay cards below (PortraitCard pt / MatchCards pt reserve the space).
const LAYOUTS = [
  { // 0 — loose constellation, gently drifting
    bigFive:  { x: 18, y: 26, s: 60, r: -8 },
    shcwartz: { x: 44, y: 12, s: 56, r: 6 },
    iq:       { x: 76, y: 24, s: 80, r: -4 },
    ecr:      { x: 24, y: 72, s: 62, r: 7 },
    pid:      { x: 50, y: 64, s: 52, r: -7 },
    cope:     { x: 78, y: 74, s: 66, r: 8 },
  },
  { // 1 — docked in a row on top of the portrait card
    bigFive:  { x: 27,   y: 38, s: 34, r: 0 },
    shcwartz: { x: 36.2, y: 38, s: 34, r: 0 },
    iq:       { x: 45.4, y: 38, s: 34, r: 0 },
    ecr:      { x: 54.6, y: 38, s: 34, r: 0 },
    pid:      { x: 63.8, y: 38, s: 34, r: 0 },
    cope:     { x: 73,   y: 38, s: 34, r: 0 },
  },
  { // 2 — split 3/3 between the "you" and "friend" cards
    bigFive:  { x: 21.5, y: 41, s: 30, r: -5 },
    shcwartz: { x: 31,   y: 40, s: 30, r: -5 },
    iq:       { x: 40.5, y: 41, s: 30, r: -5 },
    ecr:      { x: 59.5, y: 41, s: 30, r: 5 },
    pid:      { x: 69,   y: 40, s: 30, r: 5 },
    cope:     { x: 78.5, y: 41, s: 30, r: 5 },
  },
  { // 3 — a shingled memory strip the AI "consults" mid-conversation
    bigFive:  { x: 23,   y: 44, s: 24, r: -6 },
    shcwartz: { x: 28.6, y: 44, s: 24, r: 5 },
    iq:       { x: 34.2, y: 44, s: 24, r: -5 },
    ecr:      { x: 39.8, y: 44, s: 24, r: 6 },
    pid:      { x: 45.4, y: 44, s: 24, r: -5 },
    cope:     { x: 51,   y: 44, s: 24, r: 5 },
  },
];

const STEPS = [
  { accent: '#F0E68C' },
  { accent: '#D8B4FE' },
  { accent: '#FBCFE8' },
  { accent: '#BEF264' },
];

function SigilActor({ type, step, index, reduce }) {
  const { color, Glyph } = SIGILS[type];
  const p = LAYOUTS[step][type];
  const drifting = step === 0 && !reduce;
  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
      animate={{ opacity: 1, left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
      transition={
        reduce
          ? { duration: 0.25 }
          : { type: 'spring', stiffness: 220, damping: 26, delay: index * 0.045 }
      }
    >
      <motion.div
        className="w-full h-full"
        initial={{ scale: 0.4 }}
        animate={{ scale: 1, rotate: p.r, y: drifting ? [0, -6, 0] : 0 }}
        transition={{
          scale: reduce ? { duration: 0.25 } : { type: 'spring', stiffness: 240, damping: 18, delay: 0.05 + index * 0.05 },
          rotate: reduce ? { duration: 0.25 } : { type: 'spring', stiffness: 220, damping: 26 },
          y: drifting
            ? { repeat: Infinity, duration: 4.2 + index * 0.5, ease: 'easeInOut' }
            : reduce ? { duration: 0.25 } : { type: 'spring', stiffness: 220, damping: 26 },
        }}
      >
        <div
          className="w-full h-full shadow-warm flex items-center justify-center"
          style={{ backgroundColor: color, borderRadius: '27%' }}
        >
          <svg viewBox="-14 -14 28 28" className="w-[62%] h-[62%]">
            <Glyph c={INK} />
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Overlay props: a plain positioned wrapper keeps the centering translate,
   the motion inner owns its own transform — the two never fight. */
function Prop({ style, className = '', delay = 0, children }) {
  return (
    <div className={`absolute z-10 ${className}`} style={style}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
        transition={{ type: 'spring', stiffness: 240, damping: 24, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function SkeletonLines({ widths, delay = 0.35 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {widths.map((w, i) => (
        <motion.div
          key={i}
          className="h-2 rounded-full bg-persona-line origin-left"
          style={{ width: w }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: delay + i * 0.12 }}
        />
      ))}
    </div>
  );
}

// Step 1 — the portrait card the sigils dock onto; the text is "being written".
function PortraitCard() {
  const { t } = useTranslation('onboarding');
  return (
    <>
      <div className="absolute z-0 left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-64 h-44 rounded-3xl bg-persona-accent-lavender/50 rotate-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.4, delay: 0.15 }}
        />
      </div>
      <Prop style={{ left: '50%', top: '28%' }} className="w-[17rem] -translate-x-1/2">
        <div className="rounded-3xl bg-persona-card shadow-warm-lg px-5 pb-5 pt-[3.5rem]">
          <p className="font-display text-[15px] leading-snug text-persona-dark mb-3">
            {t('scene.portraitQuote')}
            <motion.span
              className="inline-block w-[2px] h-[0.95em] bg-persona-dark/70 align-[-0.12em] ml-0.5"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
              aria-hidden="true"
            />
          </p>
          <SkeletonLines widths={['100%', '72%']} />
        </div>
      </Prop>
    </>
  );
}

// Step 2 — two result cards, one verdict stamped between them.
function MatchCards() {
  const { t } = useTranslation('onboarding');
  const cards = [
    { key: 'you', x: '31%', rotate: -5, chip: 'bg-persona-dark text-white', label: t('scene.you'), delay: 0 },
    { key: 'friend', x: '69%', rotate: 5, chip: 'bg-persona-bg text-persona-dark', label: t('scene.friend'), delay: 0.08 },
  ];
  return (
    <>
      {cards.map(({ key, x, rotate, chip, label, delay }) => (
        <Prop key={key} style={{ left: x, top: '58%' }} className="-translate-x-1/2 -translate-y-1/2" delay={delay}>
          <div
            className="w-[8.75rem] h-[9.5rem] rounded-3xl bg-persona-card shadow-warm-lg px-4 pb-4 pt-[3.4rem] flex flex-col"
            style={{ transform: `rotate(${rotate}deg)` }}
          >
            <SkeletonLines widths={['100%', '64%']} delay={0.4 + delay} />
            <span className={`mt-auto self-start text-xs font-medium px-2.5 py-1 rounded-full ${chip}`}>
              {label}
            </span>
          </div>
        </Prop>
      ))}
      <Prop style={{ left: '50%', top: '88%' }} className="-translate-x-1/2 -translate-y-1/2" delay={0.32}>
        <div className="bg-persona-dark text-white rounded-full px-4 py-2 shadow-warm-lg -rotate-3 whitespace-nowrap">
          <span className="font-semibold tabular">87%</span>
          <span className="text-white/70 text-xs ml-1.5">{t('scene.match')}</span>
        </div>
      </Prop>
    </>
  );
}

// Step 3 — the AI answers with your results spread out like cards in hand.
function ChatScene() {
  const { t } = useTranslation('onboarding');
  return (
    <>
      <Prop style={{ right: '2%', top: '8%' }} className="max-w-[78%]">
        <div className="bg-persona-dark text-white rounded-3xl rounded-br-lg px-4 py-2.5 text-sm leading-relaxed">
          {t('scene.chatUser')}
        </div>
      </Prop>
      <Prop style={{ left: '2%', top: '60%' }} className="max-w-[82%]" delay={0.2}>
        <div className="bg-persona-card shadow-warm rounded-3xl rounded-bl-lg px-4 py-2.5 text-sm leading-relaxed text-persona-dark">
          {t('scene.chatAi')}
        </div>
      </Prop>
    </>
  );
}

const OVERLAYS = [null, PortraitCard, MatchCards, ChatScene];

export default function Onboarding({ onComplete }) {
  const { t } = useTranslation('onboarding');
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const { accent } = STEPS[step];
  const Overlay = OVERLAYS[step];

  const go = (index) => {
    if (index < 0 || index >= STEPS.length) return;
    setStep(index);
  };

  const complete = (skipped) => {
    posthog.capture(skipped ? 'onboarding_skipped' : 'onboarding_completed', { step: step + 1 });
    onComplete();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(step + 1);
      if (e.key === 'ArrowLeft') go(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const onDragEnd = (_, info) => {
    if (info.offset.x < -70) go(step + 1);
    else if (info.offset.x > 70) go(step - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh flex flex-col"
    >
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col px-6 pt-6 pb-8">
        <header className="flex items-center justify-between mb-2">
          <p className="text-xl font-medium tracking-tight text-persona-dark flex items-center gap-2">
            <span className="font-display text-2xl">λ</span> Persona
          </p>
          <button onClick={() => complete(true)} className="btn-ghost text-sm">
            {t('skip')}
          </button>
        </header>

        <motion.div
          className="flex-1 flex flex-col justify-center min-h-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onDragEnd}
        >
          {/* The stage: sigils persist and morph; per-step props enter/exit around them. */}
          <div className="relative h-64 sm:h-72 w-full select-none" aria-hidden="true">
            <AnimatePresence>
              {Overlay && <Overlay key={step} />}
            </AnimatePresence>
            {CAST.map((type, i) => (
              <SigilActor key={type} type={type} step={step} index={i} reduce={reduce} />
            ))}
          </div>

          <div className="mt-7 min-h-[11.5rem] sm:min-h-[10.5rem]" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <p className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-medium text-persona-dark px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${accent}99` }}
                  >
                    {t(`steps.${step}.chip`)}
                  </span>
                  <span className="tabular ml-auto text-sm text-persona-muted">
                    0{step + 1} / 0{STEPS.length}
                  </span>
                </p>
                <h1 className="font-display text-[2.1rem] sm:text-[2.6rem] font-semibold leading-[1.08] text-persona-dark mb-3">
                  {t(`steps.${step}.title`)}
                </h1>
                <p className="text-persona-muted text-base sm:text-lg leading-relaxed max-w-prose">
                  {t(`steps.${step}.description`)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <footer className="mt-6">
          <div className="flex gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <motion.button
                key={i}
                layout
                onClick={() => go(i)}
                aria-label={t('goToSlide', { n: i + 1 })}
                aria-current={i === step ? 'step' : undefined}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`h-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${
                  i === step ? 'flex-[2.5] bg-persona-dark' : i < step ? 'flex-1 bg-persona-dark/30' : 'flex-1 bg-persona-line'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <motion.button
                onClick={() => go(step - 1)}
                aria-label={t('back')}
                className="w-[52px] h-[52px] shrink-0 rounded-full border-2 border-persona-dark/10 bg-persona-card flex items-center justify-center text-persona-dark transition-colors hover:border-persona-dark/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.92 }}
              >
                <HiArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <button
              onClick={() => (isLast ? complete(false) : go(step + 1))}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isLast ? t('createPortrait') : t('next')}
              {!isLast && <HiArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}
