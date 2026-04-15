import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
} from 'react-icons/hi2';
import { testsApi } from '../../api/tests';

// ─── Static metadata the API doesn't provide ────────────────────────────────
const TEST_META = {
  iq:        { icon: HiOutlineBolt,        color: 'bg-persona-accent-yellow',   iconColor: 'text-amber-600' },
  szondi:    { icon: HiOutlineEye,         color: 'bg-persona-accent-lavender', iconColor: 'text-purple-600' },
  archetype: { icon: HiOutlineCpuChip,     color: 'bg-persona-accent-lime',     iconColor: 'text-green-600' },
  mbti:      { icon: HiOutlineFingerPrint, color: 'bg-persona-accent-pink',     iconColor: 'text-pink-600' },
};

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
    ['startTime', 'answers', 'useTimer', 'activeTestId'].forEach((s) => localStorage.removeItem(`test_${testId}_${s}`));
    localStorage.removeItem('activeTestId');
  },
};

// ─── Screens ─────────────────────────────────────────────────────────────────
const SCREEN = { LIST: 'list', PREVIEW: 'preview', TIMER_PROMPT: 'timer_prompt', QUESTIONS: 'questions', RESULT: 'result' };

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
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* shaded area */}
      {shadePath && <path d={shadePath} fill="url(#curveGrad)" />}

      {/* curve line */}
      <path d={curvePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />

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
function TestCard({ test, meta, onStart, completed }) {
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${meta.color}/30 rounded-3xl p-6 card-hover cursor-pointer border border-white/50`}
      onClick={onStart}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 ${meta.color} rounded-2xl flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${meta.iconColor}`} />
        </div>
        {completed ? (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
            <HiOutlineCheckCircle className="w-4 h-4" /> Done
          </span>
        ) : (
          <span className="text-sm font-medium text-persona-muted bg-gray-100 px-3 py-1 rounded-full">
            Not started
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-persona-dark mb-2">{test.testName}</h3>
      <p className="text-persona-muted text-sm leading-relaxed mb-4">{test.description}</p>
      <div className="flex items-center gap-2 text-persona-dark font-semibold text-sm">
        {completed ? 'View Results' : 'Take Test'} →
      </div>
    </motion.div>
  );
}

// ─── Preview Screen ──────────────────────────────────────────────────────────
function PreviewScreen({ test, meta, onStart, onViewResult, onBack, hasResult }) {
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-6 pb-8">
      <div className="flex items-center gap-4 mb-8">
        <motion.button onClick={onBack} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm" whileTap={{ scale: 0.9 }}>
          <HiOutlineArrowLeft className="w-5 h-5" />
        </motion.button>
        <h3 className="font-semibold text-persona-dark text-lg">Test Details</h3>
      </div>

      <div className="text-center mb-8">
        <motion.div
          className={`w-24 h-24 ${meta.color} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}
          initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
        >
          <Icon className={`w-12 h-12 ${meta.iconColor}`} />
        </motion.div>
        <h2 className="text-2xl font-bold text-persona-dark mb-2">{test.testName}</h2>
        <p className="text-persona-muted leading-relaxed max-w-sm mx-auto">{test.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-persona-dark">{test.totalQuestions}</p>
          <p className="text-xs text-persona-muted mt-1">Questions</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-persona-dark flex items-center justify-center gap-1">
            <HiOutlineClock className="w-5 h-5 text-persona-muted" />
            {test.duration > 0 ? `${test.duration}m` : '—'}
          </p>
          <p className="text-xs text-persona-muted mt-1">{test.duration > 0 ? 'Duration' : 'No limit'}</p>
        </div>
      </div>

      <div className="space-y-3">
        {hasResult && (
          <motion.button onClick={onViewResult} className="btn-secondary w-full" whileTap={{ scale: 0.97 }}>
            View Result
          </motion.button>
        )}
        <motion.button onClick={onStart} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
          {hasResult ? 'Retake Test' : 'Start Test'}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Timer Prompt Screen ─────────────────────────────────────────────────────
function TimerPromptScreen({ test, meta, onChoice, onBack }) {
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-6 pb-8">
      <div className="flex items-center gap-4 mb-8">
        <motion.button onClick={onBack} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm" whileTap={{ scale: 0.9 }}>
          <HiOutlineArrowLeft className="w-5 h-5" />
        </motion.button>
        <h3 className="font-semibold text-persona-dark text-lg">{test.testName}</h3>
      </div>

      <div className="text-center mb-10">
        <motion.div
          className={`w-20 h-20 ${meta.color} rounded-[1.5rem] flex items-center justify-center mx-auto mb-6`}
          initial={{ rotate: -5 }} animate={{ rotate: 0 }} transition={{ type: 'spring' }}
        >
          <HiOutlineClock className={`w-10 h-10 ${meta.iconColor}`} />
        </motion.div>
        <h2 className="text-xl font-bold text-persona-dark mb-2">Use a timer?</h2>
        <p className="text-persona-muted text-sm leading-relaxed max-w-xs mx-auto">
          This test is designed to be completed in <span className="font-semibold text-persona-dark">{test.duration} minutes</span>. Would you like to enable the countdown timer?
        </p>
      </div>

      <div className="space-y-3">
        <motion.button onClick={() => onChoice(true)} className="btn-primary w-full flex items-center justify-center gap-2" whileTap={{ scale: 0.97 }}>
          <HiOutlineClock className="w-5 h-5" /> Yes, use timer
        </motion.button>
        <motion.button onClick={() => onChoice(false)} className="btn-secondary w-full" whileTap={{ scale: 0.97 }}>
          No, continue without timer
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Questions Screen ────────────────────────────────────────────────────────
function QuestionsScreen({ test, meta, questions, useTimer, onComplete, onBack }) {
  const Icon = meta.icon;
  const isIQ = test.testType === 'iq';

  // Restore persisted answers
  const [answers, setAnswers] = useState(() => LS.get(test.id, 'answers') || []);
  const [questionIndex, setQuestionIndex] = useState(() => {
    const saved = LS.get(test.id, 'answers') || [];
    return Math.min(saved.length, questions.length - 1);
  });
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  // Preload all question images
  useEffect(() => {
    questions.forEach((q) => {
      if (q.image) {
        const img = new Image();
        img.src = q.image;
      }
    });
  }, [questions]);

  // Timer setup
  useEffect(() => {
    if (!useTimer || test.duration <= 0) return;

    let startTime = LS.get(test.id, 'startTime');
    if (!startTime) {
      startTime = Date.now();
      LS.set(test.id, 'startTime', startTime);
    }

    const totalMs = test.duration * 60 * 1000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalMs - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [useTimer, test.duration, test.id]);

  // Auto-submit when timer runs out
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && !submitting) {
      handleSubmit(answers);
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist answers
  useEffect(() => {
    LS.set(test.id, 'answers', answers);
  }, [answers, test.id]);

  const handleAnswer = (questionId, optionId) => {
    const existing = answers.findIndex((a) => a.questionId === questionId);
    let newAnswers;
    if (existing >= 0) {
      newAnswers = [...answers];
      newAnswers[existing] = { questionId, optionId };
    } else {
      newAnswers = [...answers, { questionId, optionId }];
    }
    setAnswers(newAnswers);

    // Auto-advance after short delay
    if (questionIndex < questions.length - 1) {
      setTimeout(() => setQuestionIndex((prev) => prev + 1), 250);
    }
  };

  const handleSubmit = async (finalAnswers) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isIQ) {
        const result = await testsApi.submitTest(test.id, finalAnswers);
        LS.clearAll(test.id);
        onComplete(result);
      } else {
        // Mock submit for non-IQ
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
  const currentAnswer = answers.find((a) => a.questionId === currentQ?.id);

  const formatTime = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isLastQuestion = questionIndex === questions.length - 1;
  const allAnswered = answers.length === questions.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <motion.button
          onClick={() => {
            if (answers.length > 0 && !window.confirm('Your progress will be saved. Leave this test?')) return;
            onBack();
          }}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
          whileTap={{ scale: 0.9 }}
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h3 className="font-semibold text-persona-dark">{test.testName}</h3>
          <p className="text-sm text-persona-muted">Question {questionIndex + 1} of {questions.length}</p>
        </div>
        {useTimer && timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
            timeLeft < 60000 ? 'bg-red-100 text-red-600' : timeLeft < 300000 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-persona-dark'
          }`}>
            <HiOutlineClock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-8">
        <motion.div className="h-full bg-persona-dark rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Question text or image */}
          {currentQ.image ? (
            <div className="mb-5">
              {currentQ.text && <h2 className="text-xl font-bold text-persona-dark mb-4">{currentQ.text}</h2>}
              <div className="bg-white rounded-2xl p-2 shadow-sm flex items-center justify-center">
                <img
                  src={currentQ.image}
                  alt={`Question ${questionIndex + 1}`}
                  className="w-full max-h-[50vh] object-contain rounded-xl"
                />
              </div>
            </div>
          ) : (
            <h2 className="text-2xl font-bold text-persona-dark mb-8">{currentQ.text}</h2>
          )}

          {/* Options */}
          <div className={`${isIQ ? 'flex items-center justify-center gap-2 flex-wrap' : 'space-y-3'}`}>
            {currentQ.options.map((opt, i) => {
              const isSelected = currentAnswer?.optionId === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  onClick={() => handleAnswer(currentQ.id, opt.id)}
                  className={`${isIQ
                    ? `w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold border-2 transition-all duration-200 ${
                        isSelected
                          ? 'bg-persona-dark text-white border-persona-dark shadow-lg'
                          : 'bg-white text-persona-dark border-gray-200 hover:border-persona-dark/30 hover:shadow-md'
                      }`
                    : `w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 font-medium ${
                        isSelected
                          ? 'bg-persona-dark/5 border-persona-dark/30 shadow-md'
                          : 'bg-white border-gray-100 hover:border-persona-dark/20 hover:shadow-md'
                      }`
                  }`}
                  whileTap={{ scale: 0.96 }}
                >
                  {isIQ ? (
                    opt.text
                  ) : (
                    <>
                      <span className="text-persona-muted mr-3">{String.fromCharCode(65 + i)}.</span>
                      {opt.text}
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 gap-3">
        <motion.button
          onClick={() => setQuestionIndex((p) => Math.max(0, p - 1))}
          disabled={questionIndex === 0}
          className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white border border-gray-200 text-persona-dark disabled:opacity-30 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.95 }}
        >
          ← Prev
        </motion.button>

        {isLastQuestion ? (
          <motion.button
            onClick={() => handleSubmit(answers)}
            disabled={submitting || !currentAnswer}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</span>
            ) : (
              'Submit Test'
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={() => setQuestionIndex((p) => Math.min(questions.length - 1, p + 1))}
            disabled={questionIndex === questions.length - 1}
            className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white border border-gray-200 text-persona-dark disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="text-2xl font-bold text-persona-dark mb-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            We couldn't calculate a score
          </motion.h2>

          <motion.p
            className="text-persona-muted leading-relaxed mb-3 max-w-sm mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          >
            The score was too low to produce a reliable result. This usually happens when answers are selected randomly or the test is taken without full focus.
          </motion.p>
          <motion.p
            className="text-persona-muted leading-relaxed mb-10 max-w-sm mx-auto text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          >
            No worries — it happens. When you're ready, you can give it another go.
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
            className="mt-4 text-sm text-persona-muted hover:text-persona-dark transition-colors"
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

        <h2 className="text-2xl font-bold text-persona-dark mb-2">Your IQ Score</h2>

        <motion.div
          className="text-7xl font-black text-persona-dark mb-4"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          {iq}
        </motion.div>

        {/* Bell curve */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-6">
          <BellCurve score={iq} />
          <p className="text-xs text-persona-muted mt-2">Normal distribution · μ=100 · σ=15</p>
        </motion.div>

        {/* Suspicious notice */}
        {reliability === 'suspicious' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left mb-6 max-w-sm mx-auto"
          >
            <HiOutlineInformationCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 leading-relaxed">
              Your results show some unusual patterns. You may want to retake the test for more accurate results.
            </p>
          </motion.div>
        )}

        <motion.button onClick={onDone} className="btn-primary mt-4 w-full max-w-xs mx-auto" whileTap={{ scale: 0.97 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          Done
        </motion.button>

        {reliability === 'suspicious' && (
          <motion.button onClick={onRetake} className="mt-3 text-sm text-persona-muted hover:text-persona-dark transition-colors flex items-center gap-1 mx-auto" whileTap={{ scale: 0.97 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
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
        <h2 className="text-2xl font-bold text-persona-dark mb-2">Your Result</h2>
        <motion.div
          className={`inline-block ${meta.color} px-6 py-2 rounded-full text-lg font-bold text-persona-dark mb-4`}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          {r.label || 'Completed'}
        </motion.div>
        <motion.p className="text-persona-muted leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
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
  const [useTimer, setUseTimer] = useState(false);
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
      const savedTimer = LS.get(activeTestId, 'useTimer');
      setUseTimer(!!savedTimer);

      try {
        if (test.testType === 'iq') {
          const qs = await testsApi.getTestQuestions(test.id);
          setQuestions(qs);
        } else {
          setQuestions(MOCK_DATA[test.testType]?.questions || []);
        }
        setScreen(SCREEN.QUESTIONS);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('activeTestId');
      }
      setSessionRestored(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTest = (test) => {
    setSelectedTest(test);
    setScreen(SCREEN.PREVIEW);
  };

  const handleViewResult = () => {
    if (selectedTest?.result) {
      setResult(selectedTest.result);
      setScreen(SCREEN.RESULT);
    }
  };

  const handleStartTest = () => {
    if (selectedTest.duration > 0) {
      setScreen(SCREEN.TIMER_PROMPT);
    } else {
      handleTimerChoice(false);
    }
  };

  const handleTimerChoice = async (withTimer) => {
    setUseTimer(withTimer);
    LS.set(selectedTest.id, 'useTimer', withTimer);

    // Save active test session for refresh persistence
    localStorage.setItem('activeTestId', selectedTest.id);

    // Fetch questions
    setQuestionsLoading(true);
    try {
      if (selectedTest.testType === 'iq') {
        const qs = await testsApi.getTestQuestions(selectedTest.id);
        setQuestions(qs);
      } else {
        setQuestions(MOCK_DATA[selectedTest.testType]?.questions || []);
      }
      setScreen(SCREEN.QUESTIONS);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError('Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleComplete = (res) => {
    setResult(res);
    setScreen(SCREEN.RESULT);
    fetchTests(); // Refresh list to get updated result status
  };

  const handleRetake = () => {
    LS.clearAll(selectedTest.id);
    handleStartTest();
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-persona-dark mb-1">Personality Tests</h1>
            <p className="text-persona-muted">Discover what makes you unique</p>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100/50 rounded-3xl p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-2xl" />
                  <div className="w-20 h-6 bg-gray-200 rounded-full" />
                </div>
                <div className="h-6 bg-gray-200 rounded-lg w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded-lg w-full mb-1" />
                <div className="h-4 bg-gray-200 rounded-lg w-4/5" />
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-14 pb-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchTests} className="btn-primary">Retry</button>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-6 pt-14 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-persona-dark mb-1">Personality Tests</h1>
          <p className="text-persona-muted">Discover what makes you unique</p>
        </motion.div>
        <div className="grid gap-4">
          {tests.map((test, i) => {
            const m = TEST_META[test.testType] || TEST_META.iq;
            return (
              <motion.div key={test.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <TestCard test={test} meta={m} completed={!!test.result} onStart={() => handleSelectTest(test)} />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  if (screen === SCREEN.PREVIEW && selectedTest && meta) {
    return (
      <PreviewScreen
        test={selectedTest}
        meta={meta}
        hasResult={!!selectedTest.result}
        onStart={handleStartTest}
        onViewResult={handleViewResult}
        onBack={handleBackToList}
      />
    );
  }

  if (screen === SCREEN.TIMER_PROMPT && selectedTest && meta) {
    if (questionsLoading) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-14 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-persona-dark rounded-full animate-spin mx-auto mb-4" />
            <p className="text-persona-muted">Loading questions…</p>
          </div>
        </motion.div>
      );
    }
    return <TimerPromptScreen test={selectedTest} meta={meta} onChoice={handleTimerChoice} onBack={() => setScreen(SCREEN.PREVIEW)} />;
  }

  if (screen === SCREEN.QUESTIONS && selectedTest && meta && questions.length > 0) {
    return (
      <QuestionsScreen
        test={selectedTest}
        meta={meta}
        questions={questions}
        useTimer={useTimer}
        onComplete={handleComplete}
        onBack={handleBackToList}
      />
    );
  }

  if (screen === SCREEN.RESULT && result && meta) {
    if (selectedTest.testType === 'iq') {
      return (
        <IqResultScreen
          result={result}
          meta={meta}
          onDone={handleBackToList}
          onRetake={handleRetake}
        />
      );
    }
    return <GenericResultScreen result={result} meta={meta} onDone={handleBackToList} />;
  }

  // Fallback
  return null;
}
