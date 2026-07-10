import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'framer-motion';
import {
  HiArrowRight,
  HiCheck,
  HiOutlineBookOpen,
  HiOutlineFilm,
  HiOutlineHeart,
  HiOutlineSparkles,
  HiXMark,
} from 'react-icons/hi2';
import posthog from 'posthog-js';
import { useAuth } from '../context/AuthContext';
import { SIGILS } from '../components/testSigils';
import { ProBadge } from '../components/ProPlans';
import i18n, { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';

/* ------------------------------------------------------------------ */
/* The public marketing page at /welcome — the front door for new      */
/* anonymous visitors. Speaks the product's visual language: the six   */
/* test sigils are the recurring cast, cream + grain the stage.        */
/* ------------------------------------------------------------------ */

const INK = 'rgba(26,26,26,0.72)';
const EASE = [0.22, 1, 0.36, 1];

// Display order everywhere a full set appears (ticker, grid, docked rows).
const TESTS = ['iq', 'bigFive', 'shcwartz', 'ecr', 'cope', 'pid'];

/* ----------------------------- primitives ------------------------- */

function Sigil({ type, size = 44, rotate = 0, shadow = true, className = '' }) {
  const { color, Glyph } = SIGILS[type];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${shadow ? 'shadow-warm' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '27%',
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
    >
      <svg viewBox="-14 -14 28 28" style={{ width: '62%', height: '62%' }}>
        <Glyph c={INK} />
      </svg>
    </span>
  );
}

/** Scroll-triggered entrance used by every section block. */
function Reveal({ children, delay = 0, y = 26, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px 0px' }}
      transition={reduce ? { duration: 0.3 } : { type: 'spring', stiffness: 110, damping: 20, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Marker-pen sweep behind the highlighted word in the hero headline. */
function Highlight({ children }) {
  const reduce = useReducedMotion();
  return (
    // `inline` (not inline-block) so the browser can't break the line between
    // the highlighted word and a punctuation mark that follows it.
    <span className="relative whitespace-nowrap">
      <motion.span
        aria-hidden="true"
        className="absolute -inset-x-[0.12em] bottom-[0.05em] top-[0.16em] -rotate-1 rounded-[0.35em] bg-persona-accent-yellow/70"
        style={{ originX: 0.05 }}
        initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
        animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
        transition={reduce ? { duration: 0.4, delay: 0.4 } : { duration: 0.55, ease: EASE, delay: 0.45 }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

function useTypewriter(text, started, cps = 30) {
  const reduce = useReducedMotion();
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (!started || reduce) return undefined;
    const id = setInterval(() => {
      setLen((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 1000 / cps);
    return () => clearInterval(id);
  }, [text, started, reduce, cps]);
  // Reduced motion skips the animation; a mid-type language switch just clamps.
  const n = reduce && started ? text.length : Math.min(len, text.length);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function Cursor() {
  return (
    <motion.span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[0.95em] w-[2px] bg-persona-dark/70 align-[-0.12em]"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ repeat: Infinity, duration: 1.1 }}
    />
  );
}

/** Greyed "still being written" lines under mock portrait text. */
function SkeletonBars({ widths, started, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-2" aria-hidden="true">
      {widths.map((w, i) => (
        <motion.div
          key={i}
          className="h-2 origin-left rounded-full bg-persona-line"
          style={{ width: w }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: started ? 1 : 0 }}
          transition={reduce ? { duration: 0.2 } : { duration: 0.45, ease: 'easeOut', delay: delay + i * 0.12 }}
        />
      ))}
    </div>
  );
}

function SectionHead({ chip, chipTint, title, subtitle, center = false, className = '' }) {
  return (
    <Reveal className={`${center ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}>
      <span
        className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-persona-dark"
        style={{ backgroundColor: chipTint }}
      >
        {chip}
      </span>
      <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-persona-dark sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-persona-muted sm:text-lg">{subtitle}</p>
      )}
    </Reveal>
  );
}

function LangToggle({ className = '' }) {
  const { t } = useTranslation('common');
  return (
    <div
      role="group"
      aria-label={t('language')}
      className={`flex items-center rounded-full border border-persona-line bg-white/70 p-0.5 ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((l) => {
        const active = i18n.language === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach ${
              active ? 'bg-persona-dark text-white' : 'text-persona-muted hover:text-persona-dark'
            }`}
          >
            {l.code}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- header --------------------------- */

function Header({ user, onLogin, onCta, onAnchor }) {
  const { t } = useTranslation('landing');
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 12));

  const links = [
    { id: 'how', label: t('nav.how') },
    { id: 'tests', label: t('nav.tests') },
    { id: 'pricing', label: t('nav.pricing') },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-persona-bg/85 shadow-warm backdrop-blur-md' : ''
      }`}
    >
      <div className="mx-auto flex h-16 max-w-shell items-center px-5 sm:px-8">
        <div className="flex flex-1 items-center">
          <p className="flex items-center gap-2 text-xl font-medium tracking-tight text-persona-dark">
            <span className="font-display text-2xl">λ</span> Persona
          </p>
        </div>
        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.how')}>
          {links.map((l) => (
            <button key={l.id} type="button" onClick={() => onAnchor(l.id)} className="btn-ghost text-sm">
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <LangToggle className="hidden sm:flex" />
          {!user && (
            <button type="button" onClick={onLogin} className="btn-ghost hidden text-sm sm:block">
              {t('nav.login')}
            </button>
          )}
          <button
            type="button"
            onClick={onCta}
            className="transform rounded-full bg-persona-dark px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 ease-out hover:bg-gray-800 hover:shadow-warm-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
          >
            {user ? t('nav.openApp') : t('nav.startShort')}
          </button>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------- hero ---------------------------- */

// Constellation positions around the portrait card (% of the stage).
const FLOATS = [
  { type: 'iq', x: '84%', y: '14%', s: 76, r: -6 },
  { type: 'bigFive', x: '10%', y: '18%', s: 58, r: 8 },
  { type: 'ecr', x: '5%', y: '66%', s: 64, r: -8 },
  { type: 'shcwartz', x: '92%', y: '56%', s: 56, r: 10 },
  { type: 'cope', x: '18%', y: '94%', s: 52, r: -10 },
  { type: 'pid', x: '78%', y: '92%', s: 48, r: 6 },
];

function FloatingSigil({ type, x, y, s, r, index, reduce }) {
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.35 + index * 0.09 }}
    >
      <motion.div
        initial={{ scale: 0.4 }}
        animate={{ scale: 1, y: reduce ? 0 : [0, -9, 0] }}
        transition={{
          scale: reduce
            ? { duration: 0.3, delay: 0.35 + index * 0.09 }
            : { type: 'spring', stiffness: 220, damping: 16, delay: 0.35 + index * 0.09 },
          y: reduce
            ? { duration: 0.3 }
            : { repeat: Infinity, duration: 4.4 + index * 0.55, ease: 'easeInOut', delay: index * 0.4 },
        }}
      >
        <Sigil type={type} size={s} rotate={r} />
      </motion.div>
    </motion.div>
  );
}

function HeroStage() {
  const { t } = useTranslation('landing');
  const reduce = useReducedMotion();
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStarted(true), 900);
    return () => clearTimeout(id);
  }, []);
  const { shown, done } = useTypewriter(t('stage.portraitText'), started, 26);

  return (
    <div className="relative h-[22rem] select-none sm:h-[26rem] lg:h-[30rem]" aria-hidden="true">
      {/* backplate + soft glow */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-56 w-64 -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-4xl bg-persona-accent-lavender/50"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      />
      <div className="absolute left-1/2 top-1/2 -z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-persona-accent-peach/30 blur-3xl" />

      {/* the portrait card being written */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-[16.5rem] -translate-x-1/2 -translate-y-1/2 sm:w-[18.5rem]"
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0.35 } : { type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
      >
        <div className="-rotate-2 rounded-3xl bg-persona-card px-5 pb-5 pt-4 shadow-warm-lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-persona-dark px-2.5 py-1 text-[11px] font-medium text-white">
              {t('stage.portraitLabel')}
            </span>
            <HiOutlineSparkles className="h-4 w-4 text-persona-dark/50" />
          </div>
          <p className="mb-3 min-h-[4.6rem] font-display text-[15px] leading-snug text-persona-dark">
            {shown}
            {!done && <Cursor />}
          </p>
          <SkeletonBars widths={['100%', '68%']} started={done} />
        </div>
      </motion.div>

      {FLOATS.map((f, i) => (
        <FloatingSigil key={f.type} {...f} index={i} reduce={reduce} />
      ))}
    </div>
  );
}

function Hero({ onCta, onLogin, user }) {
  const { t } = useTranslation('landing');
  const reduce = useReducedMotion();
  const enter = (delay) => ({
    initial: { opacity: 0, y: reduce ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0.3, delay } : { type: 'spring', stiffness: 120, damping: 20, delay },
  });

  return (
    <section className="relative overflow-x-clip" aria-labelledby="hero-title">
      {/* ambient blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 h-[26rem] w-[26rem] rounded-full bg-persona-accent-lavender/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-72 h-[24rem] w-[24rem] rounded-full bg-persona-accent-yellow/25 blur-3xl" />

      <div className="mx-auto grid max-w-shell items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1.05fr,0.95fr] lg:gap-6 lg:pb-24 lg:pt-16">
        <div className="relative">
          <motion.p {...enter(0)} className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-2 pr-4 text-xs font-semibold text-persona-dark/80 shadow-warm">
            <span className="flex" aria-hidden="true">
              <Sigil type="iq" size={18} shadow={false} className="ring-2 ring-white" />
              <Sigil type="ecr" size={18} shadow={false} className="-ml-1.5 ring-2 ring-white" />
              <Sigil type="pid" size={18} shadow={false} className="-ml-1.5 ring-2 ring-white" />
            </span>
            {t('hero.chip')}
          </motion.p>

          <motion.h1
            {...enter(0.08)}
            id="hero-title"
            className="font-display text-[2.55rem] font-semibold leading-[1.05] tracking-tight text-persona-dark sm:text-6xl lg:text-[4.1rem]"
          >
            <Trans t={t} i18nKey="hero.title" components={{ hl: <Highlight /> }} />
          </motion.h1>

          <motion.p {...enter(0.16)} className="mt-6 max-w-xl text-base leading-relaxed text-persona-muted sm:text-lg">
            {t('hero.subtitle')}
          </motion.p>

          <motion.div {...enter(0.24)} className="mt-9 flex flex-wrap items-center gap-4">
            <button type="button" onClick={onCta} className="btn-primary inline-flex items-center gap-2 text-base">
              {t('hero.cta')}
              <HiArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {!user && (
              <button type="button" onClick={onLogin} className="btn-ghost text-sm">
                {t('hero.haveAccount')} →
              </button>
            )}
          </motion.div>
          <motion.p {...enter(0.3)} className="mt-4 text-xs font-medium text-persona-muted">
            {t('hero.ctaNote')}
          </motion.p>
        </div>

        <HeroStage />
      </div>
    </section>
  );
}

/* ------------------------------- ticker --------------------------- */

function TickerRow({ ariaHidden = false }) {
  const { t } = useTranslation('landing');
  return (
    <div className="flex w-max shrink-0 items-center" aria-hidden={ariaHidden}>
      {TESTS.map((key) => (
        <span
          key={key}
          className="mr-5 inline-flex items-center gap-3 rounded-full bg-white py-2 pl-2.5 pr-5 shadow-warm"
        >
          <Sigil type={key} size={26} shadow={false} />
          <span className="text-sm font-semibold text-persona-dark">{t(`tests.items.${key}.name`)}</span>
          <span className="text-xs text-persona-muted">{t(`tests.items.${key}.tag`)}</span>
        </span>
      ))}
    </div>
  );
}

function Ticker() {
  return (
    <div
      className="overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
    >
      <div className="flex w-max animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused]">
        <TickerRow />
        <TickerRow ariaHidden />
      </div>
    </div>
  );
}

/* ----------------------------- how it works ----------------------- */

const STEP_ACCENTS = ['#F0E68C', '#D8B4FE', '#BEF264'];

function HowItWorks() {
  const { t } = useTranslation('landing');
  return (
    <section id="how" className="mx-auto max-w-shell scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="how-title">
      <SectionHead
        chip={t('how.chip')}
        chipTint="#F0E68C99"
        title={<span id="how-title">{t('how.title')}</span>}
      />
      <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
        {['s1', 's2', 's3'].map((k, i) => (
          <Reveal key={k} delay={i * 0.1}>
            <div className="relative border-t-2 border-persona-dark/10 pt-8">
              <span
                className="absolute -top-5 left-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl font-display text-base font-bold text-persona-dark shadow-warm"
                style={{ backgroundColor: STEP_ACCENTS[i], transform: `rotate(${i % 2 ? 3 : -3}deg)` }}
                aria-hidden="true"
              >
                0{i + 1}
              </span>
              <h3 className="font-display text-2xl font-semibold text-persona-dark">{t(`how.${k}.title`)}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-persona-muted">{t(`how.${k}.text`)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ tests grid ------------------------ */

const CARD_TILT = [-2, 1.6, -1.2, 2, -1.6, 1.2];

function TestsGrid() {
  const { t } = useTranslation('landing');
  const reduce = useReducedMotion();
  return (
    <section id="tests" className="mx-auto max-w-shell scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="tests-title">
      <SectionHead
        center
        chip={t('tests.chip')}
        chipTint="#D8B4FE80"
        title={<span id="tests-title">{t('tests.title')}</span>}
        subtitle={t('tests.subtitle')}
      />
      <ul className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3 lg:gap-6">
        {TESTS.map((key, i) => (
          <Reveal key={key} delay={i * 0.06} className="h-full">
            <motion.li
              className="flex h-full flex-col rounded-3xl bg-persona-card p-6 shadow-warm"
              style={{ rotate: reduce ? 0 : CARD_TILT[i] }}
              whileHover={reduce ? undefined : { rotate: 0, y: -6, boxShadow: '0 4px 8px rgba(70,50,30,0.05), 0 16px 40px rgba(70,50,30,0.10)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <div className="mb-4 flex items-start justify-between">
                <Sigil type={key} size={46} />
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-persona-dark/80"
                  style={{ backgroundColor: `${SIGILS[key].color}59` }}
                >
                  {t(`tests.items.${key}.tag`)}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold text-persona-dark">
                {t(`tests.items.${key}.name`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-persona-muted">{t(`tests.items.${key}.desc`)}</p>
            </motion.li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------- portrait showcase -------------------- */

function PortraitDoc() {
  const { t } = useTranslation('landing');
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const { shown, done } = useTypewriter(t('portrait.excerpt'), inView, 42);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -right-5 top-8 h-[85%] w-3/4 rotate-3 rounded-4xl bg-persona-accent-lavender/40" />
      <div className="relative rounded-4xl bg-persona-card p-6 shadow-warm-lg sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-persona-dark px-3 py-1 text-[11px] font-medium text-white">
            {t('portrait.cardLabel')}
          </span>
          <HiOutlineSparkles className="h-4 w-4 text-persona-dark/50" />
        </div>
        <div className="mb-5 flex gap-1.5">
          {TESTS.map((k) => (
            <Sigil key={k} type={k} size={30} shadow={false} />
          ))}
        </div>
        <p className="min-h-[8.5rem] font-display text-[16px] leading-relaxed text-persona-dark sm:min-h-[7.5rem]">
          {shown}
          {inView && !done && <Cursor />}
        </p>
        <div className="mt-4">
          <SkeletonBars widths={['100%', '88%', '56%']} started={done} />
        </div>
      </div>
    </div>
  );
}

const PORTRAIT_TINTS = ['#FDBA7480', '#D8B4FE80', '#BEF26480'];

function PortraitShowcase() {
  const { t } = useTranslation('landing');
  return (
    <section className="mx-auto max-w-shell px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="portrait-title">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHead
            chip={t('portrait.chip')}
            chipTint="#FDBA7480"
            title={<span id="portrait-title">{t('portrait.title')}</span>}
            subtitle={t('portrait.subtitle')}
          />
          <ul className="mt-8 space-y-4">
            {['p1', 'p2', 'p3'].map((k, i) => (
              <Reveal key={k} delay={0.1 + i * 0.08}>
                <li className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: PORTRAIT_TINTS[i] }}
                  >
                    <HiCheck className="h-4 w-4 text-persona-dark" aria-hidden="true" />
                  </span>
                  <span className="text-[15px] font-medium text-persona-dark/90">{t(`portrait.${k}`)}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal delay={0.1}>
          <PortraitDoc />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------- compatibility showcase ----------------- */

const MATCH_BARS = [
  { key: 'values', you: 86, friend: 78 },
  { key: 'attachment', you: 64, friend: 91 },
  { key: 'stress', you: 72, friend: 58 },
];

function CompareBar({ value, color, delay }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-persona-bg">
      <motion.div
        className="h-full origin-left rounded-full"
        style={{ width: `${value}%`, backgroundColor: color }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE, delay }}
      />
    </div>
  );
}

function MatchPanel() {
  const { t } = useTranslation('landing');
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -left-5 top-6 h-[88%] w-3/4 -rotate-3 rounded-4xl bg-persona-accent-pink/50" />
      <div className="relative rounded-4xl bg-persona-card p-6 shadow-warm-lg sm:p-7">
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full bg-persona-dark px-3 py-1 text-xs font-medium text-white">
            {t('match.you')}
          </span>
          <span className="rounded-full bg-persona-accent-lavender px-3 py-1 text-xs font-medium text-persona-dark">
            {t('match.friend')}
          </span>
        </div>
        <div className="space-y-5">
          {MATCH_BARS.map((b, i) => (
            <div key={b.key} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-xs font-medium text-persona-muted sm:w-28">
                {t(`match.bars.${b.key}`)}
              </span>
              <div className="flex-1 space-y-1.5">
                <CompareBar value={b.you} color="#1A1A1A" delay={0.15 + i * 0.12} />
                <CompareBar value={b.friend} color="#D8B4FE" delay={0.23 + i * 0.12} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Reveal delay={0.5} y={10} className="absolute -bottom-5 right-6">
        <div className="-rotate-3 whitespace-nowrap rounded-full bg-persona-dark px-4 py-2 text-white shadow-warm-lg">
          <span className="tabular font-semibold">87%</span>
          <span className="ml-1.5 text-xs text-white/70">{t('match.matchLabel')}</span>
        </div>
      </Reveal>
    </div>
  );
}

function MatchShowcase() {
  const { t } = useTranslation('landing');
  return (
    <section className="mx-auto max-w-shell px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="match-title">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal delay={0.1} className="order-last lg:order-first">
          <MatchPanel />
        </Reveal>
        <SectionHead
          chip={t('match.chip')}
          chipTint="#FBCFE8"
          title={<span id="match-title">{t('match.title')}</span>}
          subtitle={t('match.subtitle')}
        />
      </div>
    </section>
  );
}

/* ------------------------------ chat showcase --------------------- */

function TypingDots() {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-fit items-center gap-1 rounded-3xl rounded-bl-lg bg-persona-bg px-3.5 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-persona-dark/40"
          animate={reduce ? { opacity: [0.4, 1, 0.4] } : { y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.16, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function ChatPanel() {
  const { t } = useTranslation('landing');
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -right-5 top-10 h-[80%] w-3/4 rotate-3 rounded-4xl bg-persona-accent-blue/40" />
      <div className="relative rounded-4xl bg-persona-card p-5 shadow-warm-lg sm:p-6">
        <div className="mb-4 flex items-center gap-2.5 border-b border-persona-line pb-4">
          <span className="flex">
            {TESTS.map((k, i) => (
              <Sigil
                key={k}
                type={k}
                size={24}
                shadow={false}
                rotate={i % 2 ? 5 : -5}
                className={i ? '-ml-1.5 ring-2 ring-white' : 'ring-2 ring-white'}
              />
            ))}
          </span>
          <span className="text-[11px] font-medium text-persona-muted">{t('chat.memory')}</span>
        </div>
        <div className="space-y-3">
          <Reveal y={14} delay={0.1}>
            <div className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-persona-dark px-4 py-2.5 text-sm leading-relaxed text-white">
              {t('chat.userMsg')}
            </div>
          </Reveal>
          <Reveal y={14} delay={0.3}>
            <div className="w-fit max-w-[88%] rounded-3xl rounded-bl-lg bg-persona-bg px-4 py-2.5 text-sm leading-relaxed text-persona-dark">
              {t('chat.aiMsg')}
            </div>
          </Reveal>
          <Reveal y={14} delay={0.5}>
            <TypingDots />
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function ChatShowcase() {
  const { t } = useTranslation('landing');
  return (
    <section className="mx-auto max-w-shell px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="chat-title">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <SectionHead
          chip={t('chat.chip')}
          chipTint="#93C5FD80"
          title={<span id="chat-title">{t('chat.title')}</span>}
          subtitle={t('chat.subtitle')}
        />
        <Reveal delay={0.1}>
          <ChatPanel />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ reads strip ----------------------- */

const READ_CARDS = [
  { kind: 'film', icon: HiOutlineFilm, cover: '#93C5FD', x: '-4.5rem', r: -9, z: 1 },
  { kind: 'book', icon: HiOutlineBookOpen, cover: '#FDBA74', x: '0rem', r: 0, z: 3 },
  { kind: 'book', icon: HiOutlineBookOpen, cover: '#D8B4FE', x: '4.5rem', r: 8, z: 2 },
];

function ReadsShowcase() {
  const { t } = useTranslation('landing');
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto max-w-shell px-5 py-10 sm:px-8 sm:py-14" aria-labelledby="reads-title">
      <Reveal>
        <div className="grid items-center gap-10 overflow-hidden rounded-4xl bg-gradient-to-br from-persona-accent-peach/30 via-persona-card to-persona-accent-blue/30 p-8 shadow-warm sm:p-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-persona-dark shadow-warm">
              {t('reads.chip')}
            </span>
            <h2 id="reads-title" className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-persona-dark sm:text-4xl">
              {t('reads.title')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-persona-muted sm:text-lg">{t('reads.subtitle')}</p>
          </div>
          <div className="relative h-64" aria-hidden="true">
            {READ_CARDS.map(({ kind, icon: Icon, cover, x, r, z }, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 w-36"
                style={{ zIndex: z, x: `calc(-50% + ${x})`, y: '-50%' }}
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                whileInView={{ opacity: 1, y: '-50%', rotate: reduce ? 0 : r }}
                viewport={{ once: true, margin: '-60px 0px' }}
                transition={reduce ? { duration: 0.3 } : { type: 'spring', stiffness: 160, damping: 18, delay: 0.15 + i * 0.1 }}
                whileHover={reduce ? undefined : { rotate: 0, scale: 1.04, zIndex: 4 }}
              >
                <div className="rounded-3xl bg-persona-card p-3 shadow-warm-lg">
                  <div
                    className="relative flex h-24 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: cover }}
                  >
                    <Icon className="h-8 w-8 text-persona-dark/60" />
                    <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-persona-dark">
                      {t(`reads.${kind}`)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2 rounded-full bg-persona-line" />
                    <div className="h-2 w-3/5 rounded-full bg-persona-line" />
                  </div>
                  <div className="mt-3 flex justify-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-persona-line text-persona-muted">
                      <HiXMark className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-persona-dark text-white">
                      <HiOutlineHeart className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------- pricing ------------------------- */

const FREE_TINTS = ['#F0E68C80', '#FDBA7480', '#FBCFE8', '#BEF26480', '#93C5FD80'];

function Pricing({ onStart, onPro }) {
  const { t } = useTranslation('landing');
  const { t: tSub } = useTranslation('subscription');
  return (
    <section id="pricing" className="mx-auto max-w-shell scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="pricing-title">
      <SectionHead
        center
        chip={t('pricing.chip')}
        chipTint="#BEF264B3"
        title={<span id="pricing-title">{t('pricing.title')}</span>}
        subtitle={t('pricing.subtitle')}
      />
      <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
        {/* Free */}
        <Reveal className="h-full">
          <div className="flex h-full flex-col rounded-4xl bg-persona-card p-7 shadow-warm sm:p-8">
            <h3 className="font-display text-2xl font-semibold text-persona-dark">{t('pricing.free.name')}</h3>
            <p className="tabular mt-2 font-display text-5xl font-semibold text-persona-dark">
              {t('pricing.free.price')}
            </p>
            <ul className="mt-7 space-y-3">
              {['f1', 'f2', 'f3', 'f4', 'f5'].map((k, i) => (
                <li key={k} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: FREE_TINTS[i] }}
                  >
                    <HiCheck className="h-3.5 w-3.5 text-persona-dark" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-persona-dark">{t(`pricing.free.${k}`)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <button type="button" onClick={onStart} className="btn-secondary w-full">
                {t('pricing.free.cta')}
              </button>
            </div>
          </div>
        </Reveal>

        {/* Pro */}
        <Reveal delay={0.08} className="h-full">
          <div className="relative flex h-full flex-col overflow-hidden rounded-4xl bg-persona-dark p-7 text-white shadow-warm-lg sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-persona-accent-lavender/25 blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-persona-accent-peach/20 blur-2xl" />
            <ProBadge onDark className="self-start" />
            <p className="mt-5 text-[15px] leading-relaxed text-white/85">{t('pricing.pro.desc')}</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{tSub('plans.weekly')}</span>
                  <span className="mt-0.5 block text-xs text-persona-accent-lime">{t('pricing.pro.weeklySub')}</span>
                </span>
                <span className="tabular shrink-0 font-display text-2xl font-semibold">
                  {t('pricing.pro.weeklyPrice')}
                  <span className="font-sans text-xs font-normal text-white/55">/{t('pricing.pro.weeklyPer')}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{tSub('plans.monthly')}</span>
                  <span className="mt-0.5 block text-xs text-persona-accent-lavender">{t('pricing.pro.monthlySub')}</span>
                </span>
                <span className="tabular shrink-0 font-display text-2xl font-semibold">
                  {t('pricing.pro.monthlyPrice')}
                  <span className="font-sans text-xs font-normal text-white/55">/{t('pricing.pro.monthlyPer')}</span>
                </span>
              </div>
            </div>
            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={onPro}
                className="w-full transform rounded-full bg-white py-3.5 font-medium text-persona-dark transition-all duration-300 ease-out hover:shadow-warm-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-dark"
              >
                {t('pricing.pro.cta')}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/45">{t('pricing.pro.note')}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ final CTA ------------------------- */

function FinalCta({ onCta }) {
  const { t } = useTranslation('landing');
  const reduce = useReducedMotion();
  const float = (dur) =>
    reduce ? {} : { animate: { y: [0, -8, 0] }, transition: { repeat: Infinity, duration: dur, ease: 'easeInOut' } };
  return (
    <section className="relative mx-auto max-w-shell px-5 py-24 sm:px-8 sm:py-32" aria-labelledby="final-title">
      <motion.div className="absolute left-8 top-16 hidden md:block lg:left-24" aria-hidden="true" {...float(4.6)}>
        <Sigil type="bigFive" size={58} rotate={-8} />
      </motion.div>
      <motion.div className="absolute bottom-16 right-8 hidden md:block lg:right-24" aria-hidden="true" {...float(5.4)}>
        <Sigil type="ecr" size={64} rotate={7} />
      </motion.div>

      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <h2 id="final-title" className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-persona-dark sm:text-5xl lg:text-6xl">
            {t('final.title')}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-persona-muted sm:text-lg">{t('final.subtitle')}</p>
        </Reveal>
        <Reveal delay={0.12}>
          <button
            type="button"
            onClick={onCta}
            className="btn-primary mt-9 inline-flex items-center gap-2 px-10 text-base sm:text-lg"
          >
            {t('final.cta')}
            <HiArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="mt-4 text-xs font-medium text-persona-muted">{t('hero.ctaNote')}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------- footer -------------------------- */

function Footer({ onLogin, onRegister }) {
  const { t } = useTranslation('landing');
  return (
    <footer className="border-t border-persona-line">
      <div className="mx-auto flex max-w-shell flex-col gap-8 px-5 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <p className="flex items-center gap-2 text-xl font-medium tracking-tight text-persona-dark">
            <span className="font-display text-2xl">λ</span> Persona
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-persona-muted">{t('footer.tagline')}</p>
        </div>
        <div className="flex flex-col items-start gap-5 sm:items-end">
          <nav className="flex flex-wrap gap-1" aria-label="Persona">
            <button type="button" onClick={onLogin} className="btn-ghost text-sm">
              {t('footer.login')}
            </button>
            <button type="button" onClick={onRegister} className="btn-ghost text-sm">
              {t('footer.register')}
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <LangToggle />
            <p className="text-xs text-persona-muted">{t('footer.rights')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------- page --------------------------- */

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  useEffect(() => {
    posthog.capture('landing_viewed');
  }, []);

  const cta = (placement) => {
    posthog.capture('landing_cta_clicked', { placement, authenticated: !!user });
    navigate(user ? '/portrait' : '/register');
  };
  const login = () => {
    posthog.capture('landing_login_clicked');
    navigate(user ? '/portrait' : '/login');
  };
  const anchor = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <Header user={user} onLogin={login} onCta={() => cta('header')} onAnchor={anchor} />
      <Hero user={user} onLogin={login} onCta={() => cta('hero')} />
      <Ticker />
      <HowItWorks />
      <TestsGrid />
      <PortraitShowcase />
      <MatchShowcase />
      <ChatShowcase />
      <ReadsShowcase />
      <Pricing onStart={() => cta('pricing_free')} onPro={() => cta('pricing_pro')} />
      <FinalCta onCta={() => cta('final')} />
      <Footer onLogin={login} onRegister={() => cta('footer')} />
    </motion.div>
  );
}
