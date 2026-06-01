import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineBolt,
  HiOutlineEye,
  HiOutlineCpuChip,
  HiOutlineFingerPrint,
  HiOutlineCheckCircle,
  HiOutlineArrowLeft,
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
function BellCurve({ score }) {
  const mean = 100;
  const sigma = 15;
  const lo = 55;
  const hi = 145;
  const w = 360;
  const h = 180;
  const pad = { top: 20, bottom: 40, left: 10, right: 10 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const gauss = (x) => Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  const maxY = gauss(mean);

  const toSvgX = (v) => pad.left + ((v - lo) / (hi - lo)) * innerW;
  const toSvgY = (g) => pad.top + innerH - (g / maxY) * innerH;

  // Build the curve path
  const steps = 200;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const xVal = lo + (i / steps) * (hi - lo);
    pts.push({ x: toSvgX(xVal), y: toSvgY(gauss(xVal)) });
  }
  const curvePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  // Shaded area under curve up to user score
  const clampedScore = Math.max(lo, Math.min(hi, score));
  const shadePts = [];
  for (let i = 0; i <= steps; i++) {
    const xVal = lo + (i / steps) * (hi - lo);
    if (xVal > clampedScore) break;
    shadePts.push({ x: toSvgX(xVal), y: toSvgY(gauss(xVal)) });
  }
  const shadePath = shadePts.length > 1
    ? shadePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
      + ` L${toSvgX(clampedScore).toFixed(2)},${(pad.top + innerH).toFixed(2)} L${toSvgX(lo).toFixed(2)},${(pad.top + innerH).toFixed(2)} Z`
    : '';

  const scoreX = toSvgX(clampedScore);
  const scoreY = toSvgY(gauss(clampedScore));
  const labels = [60, 70, 85, 100, 115, 130, 140];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* shaded area */}
      {shadePath && <path d={shadePath} fill="url(#curveGrad)" />}

      {/* curve line */}
      <path d={curvePath} fill="none" stroke="#FDBA74" strokeWidth="2.5" strokeLinejoin="round" />

      {/* baseline */}
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#d1d5db" strokeWidth="1" />

      {/* score marker */}
      <line x1={scoreX} y1={scoreY} x2={scoreX} y2={pad.top + innerH} stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx={scoreX} cy={scoreY} r="5" fill="#1a1a1a" />
      <text x={scoreX} y={scoreY - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a1a1a">{score}</text>

      {/* axis labels */}
      {labels.map((v) => (
        <text key={v} x={toSvgX(v)} y={pad.top + innerH + 16} textAnchor="middle" fontSize="9" fill="#9ca3af">{v}</text>
      ))}

      {/* sigma markers */}
      {[85, 115].map((v) => (
        <line key={v} x1={toSvgX(v)} y1={pad.top + innerH} x2={toSvgX(v)} y2={pad.top + innerH + 4} stroke="#d1d5db" strokeWidth="1" />
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

// ─── Resume Prompt Screen ────────────────────────────────────────────────────
function ResumePromptScreen({ test, meta, onContinue, onRestart, onBack }) {
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-6 pb-8">
      <div className="flex items-center gap-4 mb-8">
        <motion.button onClick={onBack} aria-label="Back" className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg" whileTap={{ scale: 0.9 }}>
          <HiOutlineArrowLeft className="w-5 h-5" />
        </motion.button>
        <h3 className="font-display font-semibold text-persona-dark text-lg">{test.testName}</h3>
      </div>

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <motion.button
          onClick={() => {
            if (answers.length > 0 && !window.confirm('Your progress will be saved. Leave this test?')) return;
            onBack();
          }}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
          whileTap={{ scale: 0.9 }}
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h3 className="font-semibold text-persona-dark">{test.testName}</h3>
          <p className="text-sm text-persona-muted">Question {questionIndex + 1} of {questions.length}</p>
        </div>
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
    </motion.div>
  );
}

// ─── IQ Result Screen ────────────────────────────────────────────────────────
function IqResultScreen({ result, meta, onDone, onRetake }) {
  const { iq, reliability } = result.result;
  const Icon = meta.icon;

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
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="px-6 pt-8">
      <div className="text-center">
        <motion.div
          className={`w-28 h-28 ${meta.color} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}
          initial={{ rotate: -10 }} animate={{ rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}
        >
          <Icon className={`w-14 h-14 ${meta.iconColor}`} />
        </motion.div>

        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">Your IQ score</h2>

        <motion.div
          className="font-display text-7xl font-semibold text-persona-dark mb-4 tabular leading-none"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          {iq}
        </motion.div>

        {/* Bell curve */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-6">
          <BellCurve score={iq} />
          <p className="text-xs text-persona-muted mt-2 tabular">Normal distribution · μ=100 · σ=15</p>
        </motion.div>

        {/* Suspicious notice */}
        {reliability === 'suspicious' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="flex items-start gap-3 bg-persona-warn/10 rounded-2xl p-4 text-left mb-6 max-w-prose mx-auto"
          >
            <HiOutlineInformationCircle className="w-5 h-5 text-persona-warn flex-shrink-0 mt-0.5" />
            <p className="text-sm text-persona-warn leading-relaxed">
              Your results show some unusual patterns. You may want to retake the test for more accurate results.
            </p>
          </motion.div>
        )}

        <motion.button onClick={onDone} className="btn-primary mt-4 w-full max-w-xs mx-auto" whileTap={{ scale: 0.97 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          Done
        </motion.button>

        {reliability === 'suspicious' && (
          <motion.button onClick={onRetake} className="mt-3 text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1 py-0.5" whileTap={{ scale: 0.97 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <HiOutlineArrowPath className="w-4 h-4" /> Retake test
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Generic Result Screen (non-IQ) ─────────────────────────────────────────
function GenericResultScreen({ result, meta, onDone }) {
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
        <motion.button onClick={onDone} className="btn-primary mt-8 w-full max-w-xs mx-auto" whileTap={{ scale: 0.97 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          Done
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main Tests Component ────────────────────────────────────────────────────
export default function Tests() {
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-14 pb-6">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-14 pb-6 text-center">
          <p className="text-persona-danger mb-4">{error}</p>
          <button onClick={fetchTests} className="btn-primary">Retry</button>
        </motion.div>
      );
    }

    if (tests.length === 0) {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-14 pb-6 text-center">
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
      <motion.section aria-label="Personality tests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-6 pt-14 pb-6">
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
        test={selectedTest}
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
    return (
      <ResultScreen
        result={result}
        meta={meta}
        onDone={handleBackToList}
        onRetake={handleRetake}
      />
    );
  }

  // Fallback
  return null;
}
