import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineBolt,
  HiOutlineInformationCircle,
  HiOutlineArrowPath,
  HiOutlineSparkles,
  HiOutlineScale,
  HiOutlineHeart,
  HiOutlineLifebuoy,
  HiOutlinePuzzlePiece,
} from 'react-icons/hi2';
import { testsApi } from '../../api/tests';
import { showToast } from '../../components/Toast';
import { normalCdf } from '../../utils/tScore';
import { PART_SIZE } from './testParts';
import { invalidateTestsCache } from './testsCache';
import ImmersiveTopBar from './ImmersiveTopBar';
import ShareResultBar from './ShareResultBar';
import BigFiveResultScreen from './BigFiveResult';
import SchwartzResultScreen from './SchwartzResult';
import EcrResultScreen from './EcrResult';
import CopeResultScreen from './CopeResult';
import PidResultScreen from './PidResult';

// ─── Static metadata the API doesn't provide ────────────────────────────────
const TEST_META = {
  iq:       { icon: HiOutlineBolt,        color: 'bg-persona-accent-yellow',   iconColor: 'text-persona-dark' },
  bigFive:  { icon: HiOutlineSparkles,    color: 'bg-persona-accent-peach',    iconColor: 'text-persona-dark' },
  shcwartz: { icon: HiOutlineScale,       color: 'bg-persona-accent-lavender', iconColor: 'text-persona-dark' },
  ecr:      { icon: HiOutlineHeart,       color: 'bg-persona-accent-pink',     iconColor: 'text-persona-dark' },
  cope:     { icon: HiOutlineLifebuoy,    color: 'bg-persona-accent-blue',     iconColor: 'text-persona-dark' },
  pid:      { icon: HiOutlinePuzzlePiece, color: 'bg-persona-accent-lime',     iconColor: 'text-persona-dark' },
};

// Human-readable URL slugs for the runner / result links (nicer than the raw cuid).
const TYPE_SLUGS = {
  iq: 'logic',
  bigFive: 'personality',
  shcwartz: 'values',
  ecr: 'attachment',
  cope: 'stress',
  pid: 'shadows',
};
const testSlug = (test) => (test ? TYPE_SLUGS[test.testType] || test.testType : null);

// ─── LocalStorage helpers ────────────────────────────────────────────────────
// Suffixes in use: `answers` (single-pass progress, drives the resume prompt)
// and `part<N>_answers` (a chunked test's in-part progress, restored silently).
const LS = {
  key: (testId, suffix) => `test_${testId}_${suffix}`,
  get: (testId, suffix) => {
    try { return JSON.parse(localStorage.getItem(LS.key(testId, suffix))); } catch { return null; }
  },
  set: (testId, suffix, val) => localStorage.setItem(LS.key(testId, suffix), JSON.stringify(val)),
  remove: (testId, suffix) => localStorage.removeItem(LS.key(testId, suffix)),
  clearAll: (testId) => {
    const prefix = `test_${testId}_`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  },
};

// ─── Screens ─────────────────────────────────────────────────────────────────
const SCREEN = { LIST: 'list', RESUME: 'resume', QUESTIONS: 'questions', PART_DONE: 'partDone', RESULT: 'result' };

// ─── Bell Curve component ────────────────────────────────────────────────────

const IQ_MEAN = 100;
const IQ_SIGMA = 15;

// Whole-number percentile, clamped to 1..99 (matches how Mensa reports it).
// The normal CDF lives in utils/tScore (shared with the Big Five conversion).
function iqPercentile(score) {
  return Math.max(1, Math.min(99, Math.round(normalCdf((score - IQ_MEAN) / IQ_SIGMA) * 100)));
}

// Animate a value from 0 up to `target` on an ease-out curve (fast first, then
// settling), calling `onDone` once when it lands. With run=false it jumps
// straight to `target` (e.g. when the intro animation should be skipped).
function useCountUp(target, run, onDone, duration = 1800) {
  const [value, setValue] = useState(run ? 0 : target);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; });
  useEffect(() => {
    if (!run) return undefined; // initial state is already `target`
    let raf;
    const start = performance.now();
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * easeOutQuart(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else doneRef.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return value;
}

// Mensa-style normal-distribution chart with the user's score marked.
//  • red lower tail (below −1σ), gray bulk, green band highlighting "you"
//  • a center "Average" line at μ=100 and a red "You" marker at the score
//  • dual x-axis: raw IQ values on top, σ offsets below
function BellCurve({ score, showMarkerLabel = true, youLabel = 'You' }) {
  const { t } = useTranslation('tests');
  const mean = IQ_MEAN;
  const sigma = IQ_SIGMA;
  const lo = mean - 3 * sigma; // 55
  const hi = mean + 3 * sigma; // 145
  const w = 360;
  const h = 210;
  const pad = { top: 22, bottom: 48, left: 12, right: 12 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const baseY = pad.top + innerH;

  const gauss = (x) => Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  const maxY = gauss(mean);

  const toSvgX = (v) => pad.left + ((v - lo) / (hi - lo)) * innerW;
  const toSvgY = (g) => pad.top + innerH - (g / maxY) * innerH;

  // Filled area under the curve between two IQ values.
  const areaPath = (x1, x2) => {
    const a = Math.max(lo, Math.min(hi, x1));
    const b = Math.max(lo, Math.min(hi, x2));
    if (b <= a) return '';
    const n = 80;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const xVal = a + (i / n) * (b - a);
      d += `${i === 0 ? 'M' : 'L'}${toSvgX(xVal).toFixed(2)},${toSvgY(gauss(xVal)).toFixed(2)} `;
    }
    return d + `L${toSvgX(b).toFixed(2)},${baseY.toFixed(2)} L${toSvgX(a).toFixed(2)},${baseY.toFixed(2)} Z`;
  };

  // Curve outline.
  const steps = 200;
  let curvePath = '';
  for (let i = 0; i <= steps; i++) {
    const xVal = lo + (i / steps) * (hi - lo);
    curvePath += `${i === 0 ? 'M' : 'L'}${toSvgX(xVal).toFixed(2)},${toSvgY(gauss(xVal)).toFixed(2)} `;
  }

  const clampedScore = Math.max(lo, Math.min(hi, score));
  const scoreX = toSvgX(clampedScore);
  const scoreY = toSvgY(gauss(clampedScore));
  const meanY = toSvgY(gauss(mean));

  const ticks = [55, 70, 85, 100, 115, 130, 145];

  // Keep the "Average" and "You" captions from colliding when the score is mid-range.
  const showAverage = Math.abs(clampedScore - mean) > sigma * 0.7;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" preserveAspectRatio="xMidYMid meet">
      {/* region fills: warm bulk, peach lower tail, fixed lime "high" zone (130–145) */}
      <path d={areaPath(mean - sigma, hi)} fill="#E8E5DC" />
      <path d={areaPath(lo, mean - sigma)} fill="#FDBA74" fillOpacity="0.55" />
      <path d={areaPath(130, 145)} fill="#BEF264" fillOpacity="0.9" />

      {/* curve outline */}
      <path d={curvePath} fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" />

      {/* baseline */}
      <line x1={pad.left} y1={baseY} x2={pad.left + innerW} y2={baseY} stroke="#E8E5DC" strokeWidth="1" />

      {/* center "Average" line at the mean */}
      <line x1={toSvgX(mean)} y1={meanY} x2={toSvgX(mean)} y2={baseY} stroke="#6B7280" strokeWidth="1" strokeDasharray="3 3" />
      {showAverage && (
        <text x={toSvgX(mean)} y={baseY + 32} textAnchor="middle" fontSize="10" fontStyle="italic" fontWeight="600" fill="#6B7280">
          {t('iq.average')}
        </text>
      )}

      {/* user "You" marker — only the dot moves during the intro; the vertical
          line and labels appear once it lands on the final score */}
      <circle cx={scoreX} cy={scoreY} r="3.5" fill="#1A1A1A" />
      {showMarkerLabel && (
        <>
          <line x1={scoreX} y1={scoreY} x2={scoreX} y2={baseY} stroke="#1A1A1A" strokeWidth="1.75" />
          <text x={scoreX} y={scoreY - 9} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1A1A1A">
            {Math.round(score)}
          </text>
          <text x={scoreX} y={baseY + 32} textAnchor="middle" fontSize="10" fontStyle="italic" fontWeight="700" fill="#1A1A1A">
            {youLabel}
          </text>
        </>
      )}

      {/* x-axis: IQ values */}
      {ticks.map((iq) => (
        <g key={iq}>
          <line x1={toSvgX(iq)} y1={baseY} x2={toSvgX(iq)} y2={baseY + 4} stroke="#9ca3af" strokeWidth="1" />
          <text x={toSvgX(iq)} y={baseY + 16} textAnchor="middle" fontSize="9" fill="#6B7280">{iq}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Immersive top bar (mobile "pushed screen" chrome) ───────────────────────

// ─── Resume Prompt Screen ────────────────────────────────────────────────────
function ResumePromptScreen({ meta, onContinue, onRestart, onBack }) {
  const { t } = useTranslation('tests');
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-8">
      <ImmersiveTopBar onBack={onBack} />

      <div className="px-6 pt-2 mx-auto w-full max-w-md">
      <div className="text-center mb-10">
        <motion.div
          className={`w-20 h-20 ${meta.color} rounded-[1.5rem] flex items-center justify-center mx-auto mb-6`}
          initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
        >
          <Icon className={`w-10 h-10 ${meta.iconColor}`} />
        </motion.div>
        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">{t('resume.title')}</h2>
        <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
          {t('resume.subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        <motion.button onClick={onContinue} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
          {t('common:continue')}
        </motion.button>
        <motion.button onClick={onRestart} className="btn-secondary w-full" whileTap={{ scale: 0.97 }}>
          {t('resume.startOver')}
        </motion.button>
      </div>
      </div>
    </motion.div>
  );
}

// ─── Part-complete break screen ──────────────────────────────────────────────
// Shown between the parts of a chunked test. Confirms the just-committed part is
// saved, shows how far along the whole test is, and offers to keep going right
// away — returning to the constellation is the explicit alternative, not the
// silent default it used to be.
function PartDoneScreen({ meta, partsCompleted, partCount, onContinue, onExit }) {
  const { t } = useTranslation('tests');
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-8 pt-6">
      <div className="px-6 pt-2 mx-auto w-full max-w-md min-h-[80dvh] flex flex-col justify-center">
        <div className="text-center mb-8">
          <motion.div
            className={`w-20 h-20 ${meta.color} rounded-[1.5rem] flex items-center justify-center mx-auto mb-6`}
            initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          >
            <Icon className={`w-10 h-10 ${meta.iconColor}`} />
          </motion.div>
          <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">
            {t('partDone.title', { part: partsCompleted, parts: partCount })}
          </h2>
          <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
            {t('partDone.subtitle', { count: partCount - partsCompleted })}
          </p>
        </div>

        {/* One pill per part, filled up to the just-committed one. */}
        <div className="flex items-center justify-center gap-2 mb-8" aria-hidden="true">
          {Array.from({ length: partCount }).map((_, i) => (
            <motion.span
              key={i}
              className={`h-2 rounded-full ${i < partsCompleted ? 'bg-persona-dark' : 'bg-persona-line'}`}
              initial={{ width: 20, opacity: 0 }}
              animate={{ width: i < partsCompleted ? 36 : 20, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.06 }}
            />
          ))}
        </div>

        <div className="space-y-3">
          <motion.button onClick={onContinue} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
            {t('partDone.continue', { part: partsCompleted + 1, parts: partCount })}
          </motion.button>
          <motion.button onClick={onExit} className="btn-secondary w-full" whileTap={{ scale: 0.97 }}>
            {t('partDone.later')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Questions Screen ────────────────────────────────────────────────────────
// Two modes:
//  • Single-pass (default): the whole questionnaire in one go, answers persisted
//    to localStorage (resumable), finalized with an explicit Submit button.
//  • Chunked (PART_SIZE tests, e.g. Personality): taken one "approach" at a time.
//    Only the current part's questions are shown; answering the part's last
//    question auto-submits that fragment to the backend (the source of truth for
//    progress — no localStorage) and the parent returns to the Portrait, where the
//    just-filled segment animates. `partsCompleted` (from the backend) decides
//    which part is served next.
function QuestionsScreen({ test, meta, questions, partsCompleted = 0, onComplete, onFragmentComplete, onExit }) {
  const { t } = useTranslation('tests');
  const Icon = meta.icon;
  const isIQ = test.testType === 'iq';

  const partSize = PART_SIZE[test.testType] || questions.length || 1;
  const partCount = Math.ceil(questions.length / partSize);
  const isChunked = partCount > 1;

  // The part to take now, and the slice of questions it covers.
  const part = isChunked ? Math.min(partsCompleted, partCount - 1) : 0;
  const partStart = part * partSize;
  const partLength = Math.min(partSize, questions.length - partStart);

  // Answers are LOCAL to the current part (indexed 0..partLength-1). Single-pass
  // progress persists under `answers` (drives the resume prompt); a chunked
  // part's progress persists under its own `part<N>_answers` key so leaving
  // mid-part (back button, refresh, closed tab) doesn't silently lose up to
  // 29 answered questions — re-entering the part restores them.
  const answersKey = isChunked ? `part${part}_answers` : 'answers';
  const [answers, setAnswers] = useState(() => LS.get(test.id, answersKey) || []);
  const [qi, setQi] = useState(() => {
    const saved = LS.get(test.id, answersKey) || [];
    return Math.min(saved.length, partLength - 1);
  });
  const [submitting, setSubmitting] = useState(false);

  // Preload the current part's question images
  useEffect(() => {
    for (let i = partStart; i < partStart + partLength; i++) {
      const q = questions[i];
      if (q?.image) { const img = new Image(); img.src = q.image; }
    }
  }, [questions, partStart, partLength]);

  // Persist progress under the pass/part-specific key (see answersKey above).
  useEffect(() => {
    LS.set(test.id, answersKey, answers);
  }, [answers, test.id, answersKey]);

  const submitCurrent = async (finalAnswers) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = finalAnswers.filter(Boolean); // drop sparse slots, keep order
      if (isChunked) {
        const resp = await testsApi.submitFragment(test.id, part, payload);
        LS.remove(test.id, answersKey); // the part is committed server-side now
        onFragmentComplete(resp);
      } else {
        const result = await testsApi.submitTest(test.id, payload);
        LS.clearAll(test.id);
        onComplete(result);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      showToast(t('questions.submitError'));
      setSubmitting(false);
    }
  };

  // Answers are indexed by question POSITION within the part. Answering the
  // current question advances; answering the part's LAST question auto-submits the
  // fragment (chunked) — a single-pass test waits for the explicit Submit button.
  const handleAnswer = (localIdx, questionId, optionId) => {
    const next = answers.slice();
    next[localIdx] = { questionId, optionId };
    setAnswers(next);
    if (localIdx !== qi) return; // re-pick via Prev: stay put
    if (localIdx === partLength - 1) {
      if (isChunked) submitCurrent(next);
    } else {
      setQi(localIdx + 1);
    }
  };

  const currentQ = questions[partStart + qi];
  const currentAnswer = answers[qi];
  const answeredCount = answers.filter(Boolean).length;

  const isLast = qi === partLength - 1;
  // Single-pass tests finalize with a Submit button; chunked parts auto-submit.
  const showSubmit = !isChunked && isLast;
  // Furthest question reached within the part — Next can't skip past an unanswered one.
  const frontier = Math.min(answeredCount, partLength - 1);
  const progress = ((qi + 1) / partLength) * 100;

  // Desktop keyboard flow: 1–9 answers, ←/→ moves between answered questions.
  // Re-attached every render on purpose — the handler closes over the current
  // question/frontier, and a stale closure here would commit the wrong answer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || submitting) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= currentQ.options.length) {
        e.preventDefault();
        handleAnswer(qi, currentQ.id, currentQ.options[n - 1].id);
      } else if (e.key === 'ArrowLeft') {
        setQi((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        setQi((p) => Math.min(frontier, p + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      {/* Always a way out: progress is safe to leave behind — a chunked part's
          answers persist under its own key and single-pass runs get the resume
          prompt — so exiting needs no confirmation. */}
      <ImmersiveTopBar onBack={onExit} />
      {/* Width-capped so the answer buttons stay scannable on desktop. */}
      <div className="px-6 pt-2 mx-auto w-full max-w-2xl">
      {/* Title */}
      <div className="mb-4">
        <h3 className="font-semibold text-persona-dark">{t(`names.${test.testType}`, { defaultValue: test.testName })}</h3>
        <p className="text-sm text-persona-muted">
          {isChunked
            ? t('parts.progress', { part: part + 1, parts: partCount, n: qi + 1, total: partLength })
            : t('questions.progress', { n: qi + 1, total: partLength })}
        </p>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-persona-line rounded-full overflow-hidden mb-8">
        <motion.div className="h-full bg-persona-dark rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Question — fade-only enter, no AnimatePresence so the swap never
          gates the answer-commit logic above. */}
      <motion.div
        key={qi}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.08 }}
      >
          {/* Question text or image */}
          {currentQ.image ? (
            <div className="mb-5">
              {currentQ.text && <h2 className="font-display text-xl font-semibold text-persona-dark mb-4">{currentQ.text}</h2>}
              <div className="bg-white rounded-2xl p-2 shadow-warm flex items-center justify-center">
                <img
                  src={currentQ.image}
                  alt={t('questions.imageAlt', { n: qi + 1 })}
                  className="w-full max-h-[50vh] object-contain rounded-xl"
                />
              </div>
            </div>
          ) : (
            <h2 className="font-display text-2xl font-semibold text-persona-dark mb-8 max-w-prose">{currentQ.text}</h2>
          )}

          {/* Options */}
          <div className={`${isIQ ? 'flex items-center justify-center gap-2 flex-wrap' : 'space-y-3'}`}>
            {currentQ.options.map((opt, i) => {
              const isSelected = currentAnswer?.optionId === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  onClick={() => handleAnswer(qi, currentQ.id, opt.id)}
                  disabled={submitting}
                  aria-pressed={isSelected}
                  className={`${isIQ
                    ? `w-12 h-12 rounded-xl flex items-center justify-center text-base font-medium tabular border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${
                        isSelected
                          ? 'bg-persona-dark text-white border-persona-dark shadow-warm'
                          : 'bg-white text-persona-dark border-persona-line hover:border-persona-dark/30 hover:shadow-warm'
                      }`
                    : `w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${
                        isSelected
                          ? 'bg-persona-dark/5 border-persona-dark/30 shadow-warm'
                          : 'bg-white border-persona-line hover:border-persona-dark/20 hover:shadow-warm'
                      }`
                  }`}
                  whileTap={{ scale: 0.96 }}
                >
                  {isIQ ? (
                    opt.text
                  ) : (
                    <>
                      {/* Scale answers aren't a quiz — no letter labels. The number is a
                          desktop-only hint mirroring the 1–9 hotkeys. */}
                      <span
                        aria-hidden="true"
                        className="hidden lg:inline-flex w-5 h-5 mr-3 -mt-0.5 rounded-md border border-persona-line text-persona-muted text-[11px] font-medium items-center justify-center tabular align-middle"
                      >
                        {i + 1}
                      </span>
                      {opt.text}
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 gap-3">
        <motion.button
          onClick={() => setQi((p) => Math.max(0, p - 1))}
          disabled={qi === 0 || submitting}
          className="px-5 py-2.5 rounded-full text-sm font-medium bg-white border border-persona-line text-persona-dark disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
          whileTap={{ scale: 0.95 }}
        >
          {t('questions.prev')}
        </motion.button>

        {showSubmit ? (
          <motion.button
            onClick={() => submitCurrent(answers)}
            disabled={submitting || answeredCount !== partLength}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('questions.submitting')}</span>
            ) : (
              t('questions.submit')
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={() => setQi((p) => Math.min(frontier, p + 1))}
            disabled={qi >= frontier || submitting}
            className="px-5 py-2.5 rounded-full text-sm font-medium bg-white border border-persona-line text-persona-dark disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
            whileTap={{ scale: 0.95 }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-persona-line border-t-persona-dark rounded-full animate-spin" /> {t('questions.submitting')}</span>
            ) : (
              t('questions.next')
            )}
          </motion.button>
        )}
      </div>

      {/* Hotkey hint — pointer-equipped screens only */}
      <p className="hidden lg:block text-center text-xs text-persona-muted/70 mt-6">
        {t('questions.keyHint', { n: currentQ.options.length })}
      </p>
      </div>
    </motion.div>
  );
}

// ─── IQ Result Screen ────────────────────────────────────────────────────────
function IqResultScreen({ result, meta, onDone, onRetake, onViewPortrait, headerAction, actions, ownerName }) {
  const { t } = useTranslation('tests');
  const { iq, reliability } = result.result;
  const Icon = meta.icon;

  // Intro reveal: the score and the chart marker count up from 0 to `iq`
  // (fast, then settling). Once they land, a short beat later the top bar and
  // bottom actions fade in. Space for both is reserved during the intro so the
  // centered chart never shifts.
  const INTRO_MS = 3000;
  const [revealed, setRevealed] = useState(false);
  const count = useCountUp(iq, reliability !== 'invalid', undefined, INTRO_MS);
  // Start revealing the UI ~300ms before the count-up fully lands. The ease-out
  // is nearly settled by then, so the marker barely moves while the interface
  // fades in — this overlap removes the perceived pause at the end.
  useEffect(() => {
    if (reliability === 'invalid') return undefined;
    const id = setTimeout(() => setRevealed(true), INTRO_MS - 300);
    return () => clearTimeout(id);
  }, [reliability]);
  const displayIq = revealed ? iq : Math.round(count);

  if (reliability === 'invalid') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }} className="px-6 pt-10">
        <div className="text-center">
          <motion.div
            className={`w-24 h-24 ${meta.color}/60 rounded-[2rem] flex items-center justify-center mx-auto mb-8`}
            initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          >
            <Icon className={`w-12 h-12 ${meta.iconColor} opacity-70`} />
          </motion.div>

          <motion.h2
            className="font-display text-3xl font-semibold text-persona-dark mb-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            {t('iq.invalid.title')}
          </motion.h2>

          <motion.p
            className="text-persona-muted leading-relaxed mb-3 max-w-prose mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          >
            {t('iq.invalid.body1')}
          </motion.p>
          <motion.p
            className="text-persona-muted leading-relaxed mb-10 max-w-prose mx-auto text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          >
            {t('iq.invalid.body2')}
          </motion.p>

          {actions ?? (
            <>
              <motion.button
                onClick={onRetake}
                className="btn-primary w-full max-w-xs flex items-center justify-center gap-2 mx-auto"
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              >
                <HiOutlineArrowPath className="w-5 h-5" /> {t('iq.invalid.tryAgain')}
              </motion.button>
              <motion.button
                onClick={onDone}
                className="mt-4 text-sm text-persona-muted hover:text-persona-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1 py-0.5"
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
              >
                {t('iq.invalid.backToTests')}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-dvh flex flex-col">
      {/* Top bar — space reserved, fades in once the intro finishes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={revealed ? '' : 'pointer-events-none'}
      >
        <ImmersiveTopBar onBack={onDone} rightSlot={headerAction} />
      </motion.div>

      {/* Hero — vertically centered; stays put through the reveal */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">{ownerName ? t('iq.scoreTitleOwner', { name: ownerName }) : t('iq.scoreTitleSelf')}</h2>

        <div className="font-display text-7xl font-semibold text-persona-dark mb-4 tabular leading-none">
          {displayIq}
        </div>

        {/* chart marker uses the raw (un-rounded) value so it glides smoothly */}
        <BellCurve score={revealed ? iq : count} showMarkerLabel={revealed} youLabel={ownerName ? ownerName.split(' ')[0] : t('iq.you')} />

        {/* Percentile — space reserved so the chart doesn't shift on reveal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-sm text-persona-muted mt-4 leading-relaxed max-w-prose mx-auto"
        >
          <Trans
            t={t}
            i18nKey={ownerName ? 'iq.percentileOwner' : 'iq.percentileSelf'}
            values={{ name: ownerName, iq, pct: iqPercentile(iq), pctPercent: `${iqPercentile(iq)}%` }}
            components={{ b: <span className="font-semibold text-persona-dark tabular" /> }}
          />
        </motion.p>
      </div>

      {/* Bottom actions — pinned to the bottom, space reserved, fade in on reveal */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 8 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`px-6 pb-10 flex flex-col items-center ${revealed ? '' : 'pointer-events-none'}`}
      >
        {reliability === 'suspicious' && !ownerName && (
          <div className="flex items-start gap-3 bg-persona-warn/10 rounded-2xl p-4 text-left mb-5 max-w-prose">
            <HiOutlineInformationCircle className="w-5 h-5 text-persona-warn flex-shrink-0 mt-0.5" />
            <p className="text-sm text-persona-warn leading-relaxed">
              {t('iq.suspicious')}
            </p>
          </div>
        )}

        {actions ?? (
          <>
            <motion.button onClick={onViewPortrait} className="btn-primary w-full max-w-sm" whileTap={{ scale: 0.97 }}>
              {t('iq.viewPortrait')}
            </motion.button>

            <motion.button onClick={onRetake} className="mt-4 text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1 py-0.5" whileTap={{ scale: 0.97 }}>
              <HiOutlineArrowPath className="w-4 h-4" /> {t('iq.retake')}
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Generic Result Screen (non-IQ) ─────────────────────────────────────────
function GenericResultScreen({ result, meta, actions }) {
  const { t } = useTranslation('tests');
  const Icon = meta.icon;
  const r = result.result || {};
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="px-6 pt-8">
      <div className="text-center">
        <motion.div
          className={`w-28 h-28 ${meta.color} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}
          initial={{ rotate: -10 }} animate={{ rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}
        >
          <Icon className={`w-14 h-14 ${meta.iconColor}`} />
        </motion.div>
        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">{t('generic.title')}</h2>
        <motion.div
          className={`inline-block ${meta.color} px-6 py-2 rounded-full text-lg font-medium text-persona-dark mb-4`}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          {r.label || t('generic.completed')}
        </motion.div>
        <motion.p className="text-persona-muted leading-relaxed max-w-prose mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {r.detail || ''}
        </motion.p>
      </div>
      {actions && <div className="flex flex-col gap-3 max-w-sm mx-auto mt-10">{actions}</div>}
    </motion.div>
  );
}

// ─── Result View ─────────────────────────────────────────────────────────────
// Renders a completed result exactly as the test owner sees it (same screen,
// same intro animations). Shared by the Tests tab and the public /share page —
// the only difference is the footer (`actions`) and the top-bar right slot
// (`headerRightSlot`, e.g. the share buttons), which the caller supplies.
export function ResultView({ test, result, onBack, onRetake, onViewPortrait, headerRightSlot, actions, ownerName }) {
  const meta = TEST_META[test.testType] || TEST_META.iq;
  const RESULT_SCREENS = {
    iq: IqResultScreen,
    bigFive: BigFiveResultScreen,
    shcwartz: SchwartzResultScreen,
    ecr: EcrResultScreen,
    cope: CopeResultScreen,
    pid: PidResultScreen,
  };
  const ResultScreen = RESULT_SCREENS[test.testType] || GenericResultScreen;
  // Some screens own a full-height layout and render their own top bar (valid IQ
  // with its intro; ECR with bottom-pinned actions). Everything else uses the
  // standard immersive top bar here.
  const ownsTopBar =
    (test.testType === 'iq' && result?.result?.reliability !== 'invalid') ||
    test.testType === 'ecr';
  return (
    <>
      {!ownsTopBar && <ImmersiveTopBar onBack={onBack} rightSlot={headerRightSlot} />}
      <ResultScreen
        result={result}
        meta={meta}
        onDone={onBack}
        onRetake={onRetake}
        onViewPortrait={onViewPortrait}
        headerAction={headerRightSlot}
        actions={actions}
        ownerName={ownerName}
      />
    </>
  );
}

// ─── Main Tests Component ────────────────────────────────────────────────────
export default function Tests({ onImmersiveChange, onOpenPortrait }) {
  const { t } = useTranslation('tests');
  const location = useLocation();
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  // Fresh result from the just-submitted test, tagged with its slug so we only
  // show it for the matching URL (otherwise we fall back to the stored result).
  const [result, setResult] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  // The resume prompt is a transient dialog (no URL of its own); once the user
  // picks continue/restart we drop straight into the questions at /tests/:slug.
  const [resumeDecided, setResumeDecided] = useState(false);
  // A chunked test just committed a (non-final) part: { partsCompleted, partCount }.
  // Drives the between-parts break screen; transient like the resume prompt.
  const [partDone, setPartDone] = useState(null);
  const loadedQuestionsFor = useRef(null);

  // The URL is the source of truth: /tests → list, /tests/:slug → runner,
  // /tests/:slug/result → result. Dashboard keeps this tab mounted behind the
  // profile overlay, so ignore the path unless we're actually on /tests*.
  const onTestsRoute =
    location.pathname === '/tests' || location.pathname.startsWith('/tests/');
  const segments = location.pathname.split('/').filter(Boolean); // ['tests', slug?, 'result'?]
  const routeSlug = onTestsRoute ? segments[1] || null : null;
  const isResultRoute = onTestsRoute && segments[2] === 'result';

  const selectedTest = routeSlug ? tests.find((t) => testSlug(t) === routeSlug) : null;
  const meta = selectedTest ? (TEST_META[selectedTest.testType] || TEST_META.iq) : null;

  // Derive the current screen from the URL (+ the transient resume / part-break states).
  let screen;
  if (!routeSlug) {
    screen = SCREEN.LIST;
  } else if (isResultRoute) {
    screen = SCREEN.RESULT;
  } else if (partDone) {
    screen = SCREEN.PART_DONE;
  } else {
    const saved = selectedTest ? LS.get(selectedTest.id, 'answers') : null;
    screen = saved && saved.length > 0 && !resumeDecided ? SCREEN.RESUME : SCREEN.QUESTIONS;
  }

  // Tell the dashboard when we're on an immersive ("pushed over the app") screen
  // — taking a test, the resume prompt, or a result — so it can hide its chrome.
  useEffect(() => {
    onImmersiveChange?.(screen !== SCREEN.LIST);
    // Every screen change (into a test / result and back to the list) should
    // start at the top — the window otherwise keeps the previous scroll position.
    window.scrollTo(0, 0);
  }, [screen, onImmersiveChange]);
  useEffect(() => () => onImmersiveChange?.(false), [onImmersiveChange]);

  // A fresh resume decision whenever we (re)enter a test's runner — either a new
  // test in the URL, or coming back from that test's result page (which keeps the
  // same routeSlug, so we also key on isResultRoute). The part-break screen is
  // just as transient — it never survives leaving the runner.
  useEffect(() => { setResumeDecided(false); setPartDone(null); }, [routeSlug, isResultRoute]);

  // Fetch test list
  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await testsApi.getAllTests();
      setTests(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch tests:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: fetch tests. We intentionally do NOT auto-route an in-progress
  // session back into the test — the resume prompt should only appear when the
  // user actually returns to the test itself (clicks it, deep-links, or refreshes
  // /tests/:slug), not when they merely re-enter the app on the bare /tests list.
  useEffect(() => {
    fetchTests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load questions whenever the URL points at a test runner and we haven't loaded
  // that test's questions yet (covers clicks, deep links and refreshes alike).
  useEffect(() => {
    if (!routeSlug || isResultRoute || !selectedTest) return;
    if (loadedQuestionsFor.current === selectedTest.id) return;

    let active = true;
    setQuestionsLoading(true);
    (async () => {
      try {
        const qs = await testsApi.getTestQuestions(selectedTest.id);
        if (!active) return;
        setQuestions(qs);
        loadedQuestionsFor.current = selectedTest.id;
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        if (active) showToast(t('list.questionsError'));
      } finally {
        if (active) setQuestionsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [routeSlug, isResultRoute, selectedTest]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResumeContinue = () => setResumeDecided(true);

  const handleResumeRestart = () => {
    LS.remove(selectedTest.id, 'answers');
    setResumeDecided(true);
  };

  const handleComplete = (res) => {
    setResult({ slug: testSlug(selectedTest), data: res });
    // Both readers of the test list must see the new result: this component's
    // own copy and the shared module cache (chat/reads gates, portrait rings).
    invalidateTestsCache();
    fetchTests();
    navigate(`/tests/${testSlug(selectedTest)}/result`);
  };

  // A chunked test just committed one fragment to the backend. The cache bust makes
  // the Portrait refetch the new part count. The final fragment goes straight to the
  // result (like a full submit); earlier fragments show the between-parts break
  // screen — continue right away, or return to the Portrait and let the just-filled
  // progress segment animate.
  const handleFragmentComplete = (resp) => {
    invalidateTestsCache();
    if (resp.completed) {
      handleComplete(resp.result);
      return;
    }
    // Our own list copy must reflect the new part count too — "continue now"
    // serves the next part from selectedTest.partsCompleted.
    setTests((prev) =>
      prev.map((tst) => (tst.id === selectedTest.id ? { ...tst, partsCompleted: resp.partsCompleted } : tst)),
    );
    const partSize = PART_SIZE[selectedTest.testType] || 1;
    const partCount = Math.max(1, Math.ceil((selectedTest.totalQuestions || 0) / partSize));
    setPartDone({ partsCompleted: resp.partsCompleted, partCount });
  };

  // Open the runner without wiping progress: if an earlier retake was left
  // unfinished the resume prompt offers Continue / Start over; otherwise the
  // runner opens fresh (no saved answers → straight to the first question).
  const handleRetake = () => navigate(`/tests/${testSlug(selectedTest)}`);

  // Leaving the runner / result returns to the Portrait (the test list is retired).
  const handleBackToList = () => {
    setResult(null);
    setQuestions([]);
    loadedQuestionsFor.current = null;
    navigate('/portrait');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  // The standalone test list is retired — tests are browsed and started from the Portrait
  // now. Anyone reaching the bare /tests path (back button, stale link) is bounced there;
  // the runner & result screens below are still reached from the Portrait.
  if (screen === SCREEN.LIST) return <Navigate to="/portrait" replace />;

  // Past the list every screen needs a resolved test. While the list is still
  // loading (deep link / refresh) show a spinner; an id that doesn't exist once
  // the list has loaded bounces back to the list.
  if (!selectedTest || !meta) {
    if (loading) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-dvh flex items-center justify-center">
          <div className="animate-pulse-soft text-persona-muted">{t('common:loading')}</div>
        </motion.div>
      );
    }
    return <Navigate to="/portrait" replace />;
  }

  if (screen === SCREEN.RESUME) {
    return (
      <ResumePromptScreen
        meta={meta}
        onContinue={handleResumeContinue}
        onRestart={handleResumeRestart}
        onBack={handleBackToList}
      />
    );
  }

  if (screen === SCREEN.PART_DONE) {
    return (
      <PartDoneScreen
        meta={meta}
        partsCompleted={partDone.partsCompleted}
        partCount={partDone.partCount}
        onContinue={() => setPartDone(null)}
        onExit={() => {
          const celebrate = { type: selectedTest.testType, parts: partDone.partsCompleted };
          setPartDone(null);
          navigate('/portrait', { state: { celebrate } });
        }}
      />
    );
  }

  if (screen === SCREEN.QUESTIONS) {
    if (questionsLoading || questions.length === 0) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-dvh flex items-center justify-center">
          <div className="animate-pulse-soft text-persona-muted">{t('common:loading')}</div>
        </motion.div>
      );
    }
    return (
      <QuestionsScreen
        // Keyed by part: continuing after a break must remount so the local
        // answers/index state re-initializes for the next part's storage key.
        key={`${selectedTest.id}-${selectedTest.partsCompleted ?? 0}`}
        test={selectedTest}
        meta={meta}
        questions={questions}
        partsCompleted={selectedTest.partsCompleted ?? 0}
        onComplete={handleComplete}
        onFragmentComplete={handleFragmentComplete}
        onExit={handleBackToList}
      />
    );
  }

  if (screen === SCREEN.RESULT) {
    // Prefer the freshly submitted result; fall back to the test's stored result
    // (deep link / refresh). If neither exists, there's nothing to show.
    const shownResult = result && result.slug === routeSlug ? result.data : selectedTest.result;
    if (!shownResult) return <Navigate to="/portrait" replace />;

    return (
      <ResultView
        test={selectedTest}
        result={shownResult}
        onBack={handleBackToList}
        onRetake={handleRetake}
        onViewPortrait={onOpenPortrait}
        headerRightSlot={<ShareResultBar test={selectedTest} result={shownResult} />}
      />
    );
  }

  // Fallback
  return null;
}
