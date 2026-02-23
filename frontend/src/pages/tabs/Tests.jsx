import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineBolt, HiOutlineEye, HiOutlineCpuChip, HiOutlineFingerPrint, HiOutlineCheckCircle, HiOutlineArrowLeft } from 'react-icons/hi2';

const testCards = [
  {
    id: 'iq',
    title: 'IQ Test',
    description: 'Measure your cognitive abilities through logic, patterns, and problem-solving challenges.',
    icon: HiOutlineBolt,
    color: 'bg-persona-accent-yellow',
    iconColor: 'text-amber-600',
    questions: [
      { q: 'What comes next in the sequence: 2, 6, 12, 20, ?', options: ['28', '30', '32', '36'], answer: 1 },
      { q: 'If all Bloops are Razzies, and all Razzies are Lazzies, are all Bloops Lazzies?', options: ['Yes', 'No', 'Cannot determine', 'Sometimes'], answer: 0 },
      { q: 'Which shape completes the pattern?', options: ['Triangle', 'Circle', 'Square', 'Pentagon'], answer: 2 },
    ],
    result: { score: 127, label: 'Superior', detail: 'Your analytical reasoning is in the top 4% of the population.' },
  },
  {
    id: 'szondi',
    title: 'Szondi Test',
    description: 'Explore your unconscious drives and instinctual needs through image-based analysis.',
    icon: HiOutlineEye,
    color: 'bg-persona-accent-lavender',
    iconColor: 'text-purple-600',
    questions: [
      { q: 'Which image evokes the strongest emotion?', options: ['Image A', 'Image B', 'Image C', 'Image D'], answer: 1 },
      { q: 'Which face do you feel most drawn to?', options: ['Face 1', 'Face 2', 'Face 3', 'Face 4'], answer: 2 },
    ],
    result: { score: null, label: 'The Explorer', detail: 'You possess a strong drive for discovery and understanding of yourself and the world.' },
  },
  {
    id: 'psychotypes',
    title: 'Jungian Psychotypes',
    description: 'Discover your dominant psychological functions — thinking, feeling, sensation, or intuition.',
    icon: HiOutlineCpuChip,
    color: 'bg-persona-accent-lime',
    iconColor: 'text-green-600',
    questions: [
      { q: 'When making important decisions, you rely more on:', options: ['Logic and analysis', 'Gut feeling', 'Past experience', 'Future possibilities'], answer: 0 },
      { q: 'In social situations, you tend to:', options: ['Observe first', 'Engage immediately', 'Find a close friend', 'Lead the group'], answer: 0 },
      { q: 'You recharge by:', options: ['Being alone', 'Being with people', 'Exploring new things', 'Creating something'], answer: 0 },
    ],
    result: { score: null, label: 'Intuitive Thinker', detail: 'You combine visionary intuition with analytical precision to see the big picture.' },
  },
  {
    id: '16p',
    title: "Jung's 16 Personalities",
    description: 'Find out which of the 16 personality types best describes who you are.',
    icon: HiOutlineFingerPrint,
    color: 'bg-persona-accent-pink',
    iconColor: 'text-pink-600',
    questions: [
      { q: 'At a party, you:', options: ['Talk to many people', 'Talk to a select few', 'Find a quiet spot', 'Leave early'], answer: 1 },
      { q: 'You prefer tasks that are:', options: ['Structured and clear', 'Open-ended and creative', 'Collaborative', 'Independent'], answer: 1 },
      { q: 'When faced with conflict, you:', options: ['Confront directly', 'Seek compromise', 'Avoid it', 'Analyze it'], answer: 3 },
    ],
    result: { score: null, label: 'INTJ — The Strategist', detail: 'Imaginative and strategic thinker with a plan for everything.' },
  },
];

function TestCard({ test, onStart, completed }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${test.color}/30 rounded-3xl p-6 card-hover cursor-pointer border border-white/50`}
      onClick={onStart}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 ${test.color} rounded-2xl flex items-center justify-center`}>
          <test.icon className={`w-7 h-7 ${test.iconColor}`} />
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
      <h3 className="text-xl font-bold text-persona-dark mb-2">{test.title}</h3>
      <p className="text-persona-muted text-sm leading-relaxed mb-4">{test.description}</p>
      <div className="flex items-center gap-2 text-persona-dark font-semibold text-sm">
        {completed ? 'View Results' : 'Take Test'} →
      </div>
    </motion.div>
  );
}

function TestFlow({ test, onComplete, onBack }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);

  const currentQ = test.questions[questionIndex];
  const progress = ((questionIndex + 1) / test.questions.length) * 100;

  const handleAnswer = (optionIndex) => {
    const newAnswers = [...selectedAnswers, optionIndex];
    setSelectedAnswers(newAnswers);

    if (questionIndex === test.questions.length - 1) {
      setTimeout(() => setShowResult(true), 300);
    } else {
      setTimeout(() => setQuestionIndex((prev) => prev + 1), 300);
    }
  };

  if (showResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="px-6 pt-8"
      >
        <div className="text-center">
          <motion.div
            className={`w-28 h-28 ${test.color} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <test.icon className={`w-14 h-14 ${test.iconColor}`} />
          </motion.div>
          <h2 className="text-2xl font-bold text-persona-dark mb-2">Your Result</h2>
          {test.result.score && (
            <motion.div
              className="text-6xl font-black text-persona-dark mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              {test.result.score}
            </motion.div>
          )}
          <motion.div
            className={`inline-block ${test.color} px-6 py-2 rounded-full text-lg font-bold text-persona-dark mb-4`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {test.result.label}
          </motion.div>
          <motion.p
            className="text-persona-muted leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {test.result.detail}
          </motion.p>
          <motion.button
            onClick={onComplete}
            className="btn-primary mt-8 w-full max-w-xs"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 pt-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <motion.button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
          whileTap={{ scale: 0.9 }}
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h3 className="font-semibold text-persona-dark">{test.title}</h3>
          <p className="text-sm text-persona-muted">Question {questionIndex + 1} of {test.questions.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-8">
        <motion.div
          className="h-full bg-persona-dark rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <h2 className="text-2xl font-bold text-persona-dark mb-8">
            {currentQ.q}
          </h2>

          <div className="space-y-3">
            {currentQ.options.map((option, i) => (
              <motion.button
                key={i}
                onClick={() => handleAnswer(i)}
                className="w-full text-left p-4 rounded-2xl bg-white border-2 border-gray-100 
                         hover:border-persona-dark/20 hover:shadow-md
                         transition-all duration-200 font-medium"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-persona-muted mr-3">{String.fromCharCode(65 + i)}.</span>
                {option}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default function Tests() {
  const [activeTest, setActiveTest] = useState(null);
  const [completed, setCompleted] = useState({});

  if (activeTest) {
    return (
      <TestFlow
        test={activeTest}
        onBack={() => setActiveTest(null)}
        onComplete={() => {
          setCompleted((prev) => ({ ...prev, [activeTest.id]: true }));
          setActiveTest(null);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-14 pb-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-persona-dark mb-1">Personality Tests</h1>
        <p className="text-persona-muted">Discover what makes you unique</p>
      </motion.div>

      <div className="grid gap-4">
        {testCards.map((test, i) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <TestCard
              test={test}
              completed={!!completed[test.id]}
              onStart={() => setActiveTest(test)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
