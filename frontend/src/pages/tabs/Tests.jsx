import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineBolt,
  HiOutlineEye,
  HiOutlineCpuChip,
  HiOutlineFingerPrint,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineInformationCircle,
  HiOutlineArrowPath,
  HiOutlineSparkles,
  HiOutlineScale,
  HiOutlineHeart,
  HiOutlineLifebuoy,
  HiOutlinePuzzlePiece,
  HiOutlineLockClosed,
} from 'react-icons/hi2';
import { testsApi } from '../../api/tests';
import ImmersiveTopBar from './ImmersiveTopBar';
import BigFiveResultScreen from './BigFiveResult';
import SchwartzResultScreen from './SchwartzResult';
import EcrResultScreen from './EcrResult';
import CopeResultScreen from './CopeResult';
import PidResultScreen from './PidResult';

// ─── Static metadata the API doesn't provide ────────────────────────────────
const TEST_META = {
  iq:        { icon: HiOutlineBolt,        color: 'bg-persona-accent-yellow',   iconColor: 'text-persona-dark' },
  bigFive:   { icon: HiOutlineSparkles,    color: 'bg-persona-accent-peach',    iconColor: 'text-persona-dark' },
  szondi:    { icon: HiOutlineEye,         color: 'bg-persona-accent-lavender', iconColor: 'text-persona-dark' },
  archetype: { icon: HiOutlineCpuChip,     color: 'bg-persona-accent-lime',     iconColor: 'text-persona-dark' },
  mbti:      { icon: HiOutlineFingerPrint, color: 'bg-persona-accent-pink',     iconColor: 'text-persona-dark' },
  shcwartz:  { icon: HiOutlineScale,       color: 'bg-persona-accent-lavender', iconColor: 'text-persona-dark' },
  ecr:       { icon: HiOutlineHeart,       color: 'bg-persona-accent-pink',     iconColor: 'text-persona-dark' },
  cope:      { icon: HiOutlineLifebuoy,    color: 'bg-persona-accent-blue',     iconColor: 'text-persona-dark' },
  pid:       { icon: HiOutlinePuzzlePiece, color: 'bg-persona-accent-lime',     iconColor: 'text-persona-dark' },
};

// Tests served by the real backend (real questions, real submit).
const REAL_API_TESTS = new Set(['iq', 'bigFive', 'shcwartz', 'ecr', 'cope', 'pid']);

// Order in which tests must be taken — each completed test unlocks the next.
const TEST_ORDER = ['bigFive', 'shcwartz', 'cope', 'iq', 'ecr', 'pid'];

// ─── Mocked questions / results for non-IQ tests ────────────────────────────
const MOCK_DATA = {
  szondi: {
    questions: [
      { id: 'sq1', text: 'Which image evokes the strongest emotion?', image: '', options: [{ id: '1', text: 'Image A' }, { id: '2', text: 'Image B' }, { id: '3', text: 'Image C' }, { id: '4', text: 'Image D' }] },
      { id: 'sq2', text: 'Which face do you feel most drawn to?', image: '', options: [{ id: '1', text: 'Face 1' }, { id: '2', text: 'Face 2' }, { id: '3', text: 'Face 3' }, { id: '4', text: 'Face 4' }] },
    ],
    result: { label: 'The Explorer', detail: 'You possess a strong drive for discovery and understanding of yourself and the world.' },
  },
  archetype: {
    questions: [
      { id: 'aq1', text: 'When making important decisions, you rely more on:', image: '', options: [{ id: '1', text: 'Logic and analysis' }, { id: '2', text: 'Gut feeling' }, { id: '3', text: 'Past experience' }, { id: '4', text: 'Future possibilities' }] },
      { id: 'aq2', text: 'In social situations, you tend to:', image: '', options: [{ id: '1', text: 'Observe first' }, { id: '2', text: 'Engage immediately' }, { id: '3', text: 'Find a close friend' }, { id: '4', text: 'Lead the group' }] },
      { id: 'aq3', text: 'You recharge by:', image: '', options: [{ id: '1', text: 'Being alone' }, { id: '2', text: 'Being with people' }, { id: '3', text: 'Exploring new things' }, { id: '4', text: 'Creating something' }] },
    ],
    result: { label: 'Intuitive Thinker', detail: 'You combine visionary intuition with analytical precision to see the big picture.' },
  },
  mbti: {
    questions: [
      { id: 'mq1', text: 'At a party, you:', image: '', options: [{ id: '1', text: 'Talk to many people' }, { id: '2', text: 'Talk to a select few' }, { id: '3', text: 'Find a quiet spot' }, { id: '4', text: 'Leave early' }] },
      { id: 'mq2', text: 'You prefer tasks that are:', image: '', options: [{ id: '1', text: 'Structured and clear' }, { id: '2', text: 'Open-ended and creative' }, { id: '3', text: 'Collaborative' }, { id: '4', text: 'Independent' }] },
      { id: 'mq3', text: 'When faced with conflict, you:', image: '', options: [{ id: '1', text: 'Confront directly' }, { id: '2', text: 'Seek compromise' }, { id: '3', text: 'Avoid it' }, { id: '4', text: 'Analyze it' }] },
    ],
    result: { label: 'INTJ — The Strategist', detail: 'Imaginative and strategic thinker with a plan for everything.' },
  },
};

// ─── LocalStorage helpers ────────────────────────────────────────────────────
const LS = {
  key: (testId, suffix) => `test_${testId}_${suffix}`,
  get: (testId, suffix) => {
    try { return JSON.parse(localStorage.getItem(LS.key(testId, suffix))); } catch { return null; }
  },
  set: (testId, suffix, val) => localStorage.setItem(LS.key(testId, suffix), JSON.stringify(val)),
  remove: (testId, suffix) => localStorage.removeItem(LS.key(testId, suffix)),
  clearAll: (testId) => {
    ['answers'].forEach((s) => localStorage.removeItem(`test_${testId}_${s}`));
    localStorage.removeItem('activeTestId');
  },
};

// ─── Screens ─────────────────────────────────────────────────────────────────
const SCREEN = { LIST: 'list', RESUME: 'resume', QUESTIONS: 'questions', RESULT: 'result' };

// ─── Bell Curve component ────────────────────────────────────────────────────

const IQ_MEAN = 100;
const IQ_SIGMA = 15;

// Standard normal CDF via the Abramowitz-Stegun erf approximation.
// Returns the share of the population scoring at or below `x`.
function normalCdf(x, mean = IQ_MEAN, sigma = IQ_SIGMA) {
  const z = (x - mean) / (sigma * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-z * z);
  return 0.5 * (1 + (z >= 0 ? erf : -erf));
}

// Whole-number percentile, clamped to 1..99 (matches how Mensa reports it).
function iqPercentile(score) {
  return Math.max(1, Math.min(99, Math.round(normalCdf(score) * 100)));
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
function BellCurve({ score, showMarkerLabel = true }) {
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
          Average
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
            You
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

// ─── Test Card ───────────────────────────────────────────────────────────────
function TestCard({ test, meta, completed, locked, expanded, loading, onToggle, onStart, onView }) {
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onToggle}
      whileTap={{ scale: 0.99 }}
      className={`surface-warm rounded-3xl p-6 border border-white/50 cursor-pointer ${expanded ? '' : 'card-hover'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 ${meta.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-7 h-7 ${meta.iconColor}`} />
        </div>
        <h3 className="flex-1 min-w-0 font-display text-xl font-semibold text-persona-dark">{test.testName}</h3>
        {completed ? (
          <span className="flex items-center gap-1 text-xs font-medium tracking-wide text-persona-dark bg-persona-accent-lime/50 px-2.5 py-1 rounded-md flex-shrink-0">
            <HiOutlineCheckCircle className="w-4 h-4" /> Done
          </span>
        ) : locked ? (
          <span className="flex items-center gap-1 text-xs font-medium tracking-wide text-persona-muted bg-persona-line px-2.5 py-1 rounded-md flex-shrink-0">
            <HiOutlineLockClosed className="w-3.5 h-3.5" /> Locked
          </span>
        ) : (
          <span className="text-xs font-medium tracking-wide text-persona-muted bg-persona-line px-2.5 py-1 rounded-md flex-shrink-0">
            Not started
          </span>
        )}
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {locked ? (
                <>
                  <p className="text-persona-muted text-sm leading-relaxed mb-4">
                    Complete the earlier tests first to unlock this one.
                  </p>
                  <div className="w-full py-3.5 px-8 rounded-full font-medium text-center bg-persona-line text-persona-muted">
                    Unavailable
                  </div>
                </>
              ) : (
                <>
                  <p className="text-persona-muted text-sm leading-relaxed mb-4">{test.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-persona-dark bg-persona-line/70 px-2.5 py-1 rounded-md">
                      <HiOutlineClock className="w-3.5 h-3.5" />
                      {test.duration > 0 ? `~${test.duration} min` : 'No time limit'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-persona-dark bg-persona-line/70 px-2.5 py-1 rounded-md tabular">
                      {test.totalQuestions} questions
                    </span>
                  </div>
                  {completed ? (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); onView(); }}
                      className="btn-secondary w-full"
                      whileTap={{ scale: 0.97 }}
                    >
                      View result
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); onStart(); }}
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      whileTap={{ scale: 0.97 }}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Loading…
                        </span>
                      ) : (
                        'Start test'
                      )}
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Immersive top bar (mobile "pushed screen" chrome) ───────────────────────

// ─── Resume Prompt Screen ────────────────────────────────────────────────────
function ResumePromptScreen({ meta, onContinue, onRestart, onBack }) {
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-8">
      <ImmersiveTopBar onBack={onBack} />

      <div className="px-6 pt-2">
      <div className="text-center mb-10">
        <motion.div
          className={`w-20 h-20 ${meta.color} rounded-[1.5rem] flex items-center justify-center mx-auto mb-6`}
          initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
        >
          <Icon className={`w-10 h-10 ${meta.iconColor}`} />
        </motion.div>
        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">Continue where you left off?</h2>
        <p className="text-persona-muted text-sm leading-relaxed max-w-prose mx-auto">
          You have unfinished progress on this test. Continue, or start over from the first question?
        </p>
      </div>

      <div className="space-y-3">
        <motion.button onClick={onContinue} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
          Continue
        </motion.button>
        <motion.button onClick={onRestart} className="btn-secondary w-full" whileTap={{ scale: 0.97 }}>
          Start over
        </motion.button>
      </div>
      </div>
    </motion.div>
  );
}

// ─── Questions Screen ────────────────────────────────────────────────────────
function QuestionsScreen({ test, meta, questions, onComplete, onBack }) {
  const Icon = meta.icon;
  const isIQ = test.testType === 'iq';

  // Restore persisted answers
  const [answers, setAnswers] = useState(() => LS.get(test.id, 'answers') || []);
  const [questionIndex, setQuestionIndex] = useState(() => {
    const saved = LS.get(test.id, 'answers') || [];
    return Math.min(saved.length, questions.length - 1);
  });
  const [submitting, setSubmitting] = useState(false);

  // Preload all question images
  useEffect(() => {
    questions.forEach((q) => {
      if (q.image) {
        const img = new Image();
        img.src = q.image;
      }
    });
  }, [questions]);

  // Persist answers
  useEffect(() => {
    LS.set(test.id, 'answers', answers);
  }, [answers, test.id]);

  // Answers are indexed by question POSITION (not by questionId), so that two
  // questions sharing the same backend questionId remain distinct entries.
  // Functional updaters keep rapid clicks from clobbering each other under
  // React's batching — every click writes to its own slot from a fresh `prev`.
  const handleAnswer = (qIdx, questionId, optionId) => {
    setAnswers((prev) => {
      const next = prev.slice();
      next[qIdx] = { questionId, optionId };
      return next;
    });
    // Only advance when the user answered the question they're currently on —
    // a re-pick via Prev should stay on that earlier question.
    setQuestionIndex((prev) =>
      qIdx === prev ? Math.min(prev + 1, questions.length - 1) : prev,
    );
  };

  const handleSubmit = async (finalAnswers) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Drop any skipped (sparse) slots while preserving order and duplicates.
      const payload = finalAnswers.filter(Boolean);
      if (REAL_API_TESTS.has(test.testType)) {
        const result = await testsApi.submitTest(test.id, payload);
        LS.clearAll(test.id);
        onComplete(result);
      } else {
        // Mock submit for tests not yet wired to the backend
        LS.clearAll(test.id);
        onComplete({
          testId: test.id,
          testType: test.testType,
          result: MOCK_DATA[test.testType]?.result || {},
        });
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitting(false);
    }
  };

  const currentQ = questions[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;
  const currentAnswer = answers[questionIndex];

  const isLastQuestion = questionIndex === questions.length - 1;
  // Furthest question reached (the unanswered "frontier"). You can navigate back
  // and forward freely up to here, but Next can't skip past an unanswered one.
  const maxReachedIndex = Math.min(answers.filter(Boolean).length, questions.length - 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <ImmersiveTopBar
        onBack={() => {
          if (answers.length > 0 && !window.confirm('Your progress will be saved. Leave this test?')) return;
          onBack();
        }}
      />

      <div className="px-6 pt-2">
      {/* Title */}
      <div className="mb-4">
        <h3 className="font-semibold text-persona-dark">{test.testName}</h3>
        <p className="text-sm text-persona-muted">Question {questionIndex + 1} of {questions.length}</p>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-persona-line rounded-full overflow-hidden mb-8">
        <motion.div className="h-full bg-persona-dark rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Question — fade-only enter, no AnimatePresence so the swap never
          gates the answer-commit logic above. */}
      <motion.div
        key={questionIndex}
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
                  alt={`Question ${questionIndex + 1}`}
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
                  onClick={() => handleAnswer(questionIndex, currentQ.id, opt.id)}
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
                      <span className="text-persona-muted mr-3 tabular">{String.fromCharCode(65 + i)}.</span>
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
          onClick={() => setQuestionIndex((p) => Math.max(0, p - 1))}
          disabled={questionIndex === 0}
          className="px-5 py-2.5 rounded-full text-sm font-medium bg-white border border-persona-line text-persona-dark disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
          whileTap={{ scale: 0.95 }}
        >
          ← Prev
        </motion.button>

        {isLastQuestion ? (
          <motion.button
            onClick={() => handleSubmit(answers)}
            disabled={submitting || answers.filter(Boolean).length !== questions.length}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</span>
            ) : (
              'Submit test'
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={() => setQuestionIndex((p) => Math.min(maxReachedIndex, p + 1))}
            disabled={questionIndex >= maxReachedIndex}
            className="px-5 py-2.5 rounded-full text-sm font-medium bg-white border border-persona-line text-persona-dark disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
            whileTap={{ scale: 0.95 }}
          >
            Next →
          </motion.button>
        )}
      </div>
      </div>
    </motion.div>
  );
}

// ─── IQ Result Screen ────────────────────────────────────────────────────────
function IqResultScreen({ result, meta, onDone, onRetake, onViewPortrait }) {
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
            We couldn&apos;t calculate a score
          </motion.h2>

          <motion.p
            className="text-persona-muted leading-relaxed mb-3 max-w-prose mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          >
            The score was too low to produce a reliable result. This usually happens when answers are selected randomly or the test is taken without full focus.
          </motion.p>
          <motion.p
            className="text-persona-muted leading-relaxed mb-10 max-w-prose mx-auto text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          >
            No worries — it happens. When you&apos;re ready, you can give it another go.
          </motion.p>

          <motion.button
            onClick={onRetake}
            className="btn-primary w-full max-w-xs flex items-center justify-center gap-2 mx-auto"
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          >
            <HiOutlineArrowPath className="w-5 h-5" /> Try again
          </motion.button>
          <motion.button
            onClick={onDone}
            className="mt-4 text-sm text-persona-muted hover:text-persona-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1 py-0.5"
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          >
            Back to tests
          </motion.button>
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
        <ImmersiveTopBar onBack={onDone} />
      </motion.div>

      {/* Hero — vertically centered; stays put through the reveal */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">Your IQ score</h2>

        <div className="font-display text-7xl font-semibold text-persona-dark mb-4 tabular leading-none">
          {displayIq}
        </div>

        {/* chart marker uses the raw (un-rounded) value so it glides smoothly */}
        <BellCurve score={revealed ? iq : count} showMarkerLabel={revealed} />

        {/* Percentile — space reserved so the chart doesn't shift on reveal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-sm text-persona-muted mt-4 leading-relaxed max-w-prose mx-auto"
        >
          Your IQ of <span className="font-semibold text-persona-dark tabular">{iq}</span> is equivalent to the{' '}
          <span className="font-semibold text-persona-dark tabular">{iqPercentile(iq)}th</span> percentile — higher than{' '}
          <span className="tabular">{iqPercentile(iq)}%</span> of people, with a standard deviation of 15.
        </motion.p>
      </div>

      {/* Bottom actions — pinned to the bottom, space reserved, fade in on reveal */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 8 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`px-6 pb-10 flex flex-col items-center ${revealed ? '' : 'pointer-events-none'}`}
      >
        {reliability === 'suspicious' && (
          <div className="flex items-start gap-3 bg-persona-warn/10 rounded-2xl p-4 text-left mb-5 max-w-prose">
            <HiOutlineInformationCircle className="w-5 h-5 text-persona-warn flex-shrink-0 mt-0.5" />
            <p className="text-sm text-persona-warn leading-relaxed">
              Your results show some unusual patterns. You may want to retake the test for more accurate results.
            </p>
          </div>
        )}

        <motion.button onClick={onViewPortrait} className="btn-primary w-full max-w-sm" whileTap={{ scale: 0.97 }}>
          View portrait
        </motion.button>

        <motion.button onClick={onRetake} className="mt-4 text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1 py-0.5" whileTap={{ scale: 0.97 }}>
          <HiOutlineArrowPath className="w-4 h-4" /> Retake test
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Generic Result Screen (non-IQ) ─────────────────────────────────────────
function GenericResultScreen({ result, meta }) {
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
        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">Your result</h2>
        <motion.div
          className={`inline-block ${meta.color} px-6 py-2 rounded-full text-lg font-medium text-persona-dark mb-4`}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          {r.label || 'Completed'}
        </motion.div>
        <motion.p className="text-persona-muted leading-relaxed max-w-prose mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {r.detail || ''}
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Main Tests Component ────────────────────────────────────────────────────
export default function Tests({ onImmersiveChange, onOpenPortrait }) {
  const [screen, setScreen] = useState(SCREEN.LIST);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [result, setResult] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Tell the dashboard when we're on an immersive ("pushed over the app") screen
  // — taking a test, the resume prompt, or a result — so it can hide its chrome.
  useEffect(() => {
    onImmersiveChange?.(screen !== SCREEN.LIST);
    // Every screen change (into a test / result and back to the list) should
    // start at the top — the window otherwise keeps the previous scroll position.
    window.scrollTo(0, 0);
  }, [screen, onImmersiveChange]);
  useEffect(() => () => onImmersiveChange?.(false), [onImmersiveChange]);

  // Fetch test list
  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await testsApi.getAllTests();
      setTests(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch tests:', err);
      setError('Failed to load tests');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: fetch tests, then check for an active session to restore
  useEffect(() => {
    fetchTests().then(async (fetchedTests) => {
      if (sessionRestored) return;
      const activeTestId = localStorage.getItem('activeTestId');
      if (!activeTestId || !fetchedTests.length) { setSessionRestored(true); return; }

      const savedAnswers = LS.get(activeTestId, 'answers');
      if (!savedAnswers || savedAnswers.length === 0) {
        // No in-progress answers, clear stale session
        localStorage.removeItem('activeTestId');
        setSessionRestored(true);
        return;
      }

      const test = fetchedTests.find((t) => t.id === activeTestId);
      if (!test) { localStorage.removeItem('activeTestId'); setSessionRestored(true); return; }

      // Restore session
      setSelectedTest(test);

      try {
        if (REAL_API_TESTS.has(test.testType)) {
          const qs = await testsApi.getTestQuestions(test.id);
          setQuestions(qs);
        } else {
          setQuestions(MOCK_DATA[test.testType]?.questions || []);
        }
        setScreen(SCREEN.RESUME);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('activeTestId');
      }
      setSessionRestored(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (testId) => {
    setExpandedId((prev) => (prev === testId ? null : testId));
  };

  const viewResult = (test) => {
    if (!test?.result) return;
    setSelectedTest(test);
    setResult(test.result);
    setScreen(SCREEN.RESULT);
  };

  // Begin a test: persist the session, fetch its questions, and open the runner.
  const beginTest = async (test) => {
    setSelectedTest(test);
    localStorage.setItem('activeTestId', test.id);

    setQuestionsLoading(true);
    try {
      if (REAL_API_TESTS.has(test.testType)) {
        const qs = await testsApi.getTestQuestions(test.id);
        setQuestions(qs);
      } else {
        setQuestions(MOCK_DATA[test.testType]?.questions || []);
      }
      const saved = LS.get(test.id, 'answers');
      setScreen(saved && saved.length > 0 ? SCREEN.RESUME : SCREEN.QUESTIONS);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError('Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleResumeContinue = () => setScreen(SCREEN.QUESTIONS);

  const handleResumeRestart = () => {
    LS.remove(selectedTest.id, 'answers');
    setScreen(SCREEN.QUESTIONS);
  };

  const handleComplete = (res) => {
    setResult(res);
    setScreen(SCREEN.RESULT);
    fetchTests(); // Refresh list to get updated result status
  };

  const handleRetake = () => {
    LS.clearAll(selectedTest.id);
    beginTest(selectedTest);
  };

  const handleBackToList = () => {
    setScreen(SCREEN.LIST);
    setSelectedTest(null);
    setResult(null);
    setQuestions([]);
    localStorage.removeItem('activeTestId');
  };

  const meta = selectedTest ? (TEST_META[selectedTest.testType] || TEST_META.iq) : null;

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (screen === SCREEN.LIST) {
    if (loading) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-2 pb-6">
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-persona-line/40 rounded-3xl p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-persona-line rounded-2xl" />
                  <div className="w-20 h-6 bg-persona-line rounded-md" />
                </div>
                <div className="h-6 bg-persona-line rounded-lg w-2/3 mb-2" />
                <div className="h-4 bg-persona-line rounded-lg w-full mb-1" />
                <div className="h-4 bg-persona-line rounded-lg w-4/5" />
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-2 pb-6 text-center">
          <p className="text-persona-danger mb-4">{error}</p>
          <button onClick={fetchTests} className="btn-primary">Retry</button>
        </motion.div>
      );
    }

    if (tests.length === 0) {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-2 pb-6 text-center">
          <h1 className="font-display text-4xl font-semibold text-persona-dark mb-2">Nothing taken yet</h1>
          <p className="text-persona-muted max-w-prose mx-auto">No tests are available right now. Check back soon.</p>
        </motion.div>
      );
    }

    const completedTypes = new Set(tests.filter((t) => t.result).map((t) => t.testType));
    const orderedTests = [...tests].sort(
      (a, b) => TEST_ORDER.indexOf(a.testType) - TEST_ORDER.indexOf(b.testType),
    );

    return (
      <motion.section aria-label="Personality tests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-6 pt-2 pb-6">
        <div className="grid gap-4">
          {orderedTests.map((test, i) => {
            const m = TEST_META[test.testType] || TEST_META.iq;
            const completed = !!test.result;
            const idx = TEST_ORDER.indexOf(test.testType);
            const unlocked = idx <= 0 || TEST_ORDER.slice(0, idx).every((t) => completedTypes.has(t));
            const locked = !completed && !unlocked;
            return (
              <motion.div key={test.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <TestCard
                  test={test}
                  meta={m}
                  completed={completed}
                  locked={locked}
                  expanded={expandedId === test.id}
                  loading={questionsLoading && expandedId === test.id}
                  onToggle={() => toggleExpand(test.id)}
                  onStart={() => beginTest(test)}
                  onView={() => viewResult(test)}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    );
  }

  if (screen === SCREEN.RESUME && selectedTest && meta) {
    return (
      <ResumePromptScreen
        meta={meta}
        onContinue={handleResumeContinue}
        onRestart={handleResumeRestart}
        onBack={handleBackToList}
      />
    );
  }

  if (screen === SCREEN.QUESTIONS && selectedTest && meta && questions.length > 0) {
    return (
      <QuestionsScreen
        test={selectedTest}
        meta={meta}
        questions={questions}
        onComplete={handleComplete}
        onBack={handleBackToList}
      />
    );
  }

  if (screen === SCREEN.RESULT && result && meta) {
    const RESULT_SCREENS = {
      iq: IqResultScreen,
      bigFive: BigFiveResultScreen,
      shcwartz: SchwartzResultScreen,
      ecr: EcrResultScreen,
      cope: CopeResultScreen,
      pid: PidResultScreen,
    };
    const ResultScreen = RESULT_SCREENS[selectedTest.testType] || GenericResultScreen;
    // Some result screens own a full-height layout and render their own top bar
    // (valid IQ with its intro; ECR with bottom-pinned actions). Everything else
    // (incl. the invalid IQ state) uses the standard immersive top bar here.
    const ownsTopBar =
      (selectedTest.testType === 'iq' && result?.result?.reliability !== 'invalid') ||
      selectedTest.testType === 'ecr';
    return (
      <>
        {!ownsTopBar && <ImmersiveTopBar onBack={handleBackToList} />}
        <ResultScreen
          result={result}
          meta={meta}
          onDone={handleBackToList}
          onRetake={handleRetake}
          onViewPortrait={onOpenPortrait}
        />
      </>
    );
  }

  // Fallback
  return null;
}
