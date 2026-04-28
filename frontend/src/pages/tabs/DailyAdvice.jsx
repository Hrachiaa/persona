import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineCalendarDays, HiOutlineSparkles } from 'react-icons/hi2';

const tips = [
  {
    text: "Today, embrace the silence. Your best ideas come when you give your mind space to wander without pressure.",
    category: 'Mindfulness',
    emoji: '🧘',
    color: 'bg-persona-accent-lavender/40',
  },
  {
    text: "Challenge yourself to express one genuine compliment to someone today. Connection doesn't always require grand gestures.",
    category: 'Social',
    emoji: '💬',
    color: 'bg-persona-accent-blue/40',
  },
  {
    text: "Your perfectionism is a superpower — but today, try finishing something at 80%. Done is better than perfect.",
    category: 'Productivity',
    emoji: '🚀',
    color: 'bg-persona-accent-yellow/40',
  },
  {
    text: "Step outside your routine today. Visit a new place, try a new food, or read something outside your usual genre.",
    category: 'Growth',
    emoji: '🌱',
    color: 'bg-persona-accent-lime/40',
  },
  {
    text: "Remember: not every problem needs solving immediately. Sometimes the best strategy is patience.",
    category: 'Wisdom',
    emoji: '🦉',
    color: 'bg-persona-accent-pink/40',
  },
  {
    text: "Your analytical mind is a gift. Today, use it to understand someone else's perspective, not just to solve a problem.",
    category: 'Empathy',
    emoji: '❤️',
    color: 'bg-persona-accent-peach/40',
  },
];

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function DailyAdvice({ userName }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const currentTip = tips[tipIndex];

  const nextTip = () => {
    setDirection(1);
    setTipIndex((prev) => (prev + 1) % tips.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-14 pb-6 min-h-[calc(100dvh-80px)] flex flex-col"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="font-display text-4xl font-semibold text-persona-dark mb-1">Daily advice</h1>
        <p className="text-persona-muted">A small idea to sit with today.</p>
      </motion.div>

      {/* Date */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-sm text-persona-muted mb-8 tabular"
      >
        <HiOutlineCalendarDays className="w-4 h-4" />
        {today}
      </motion.div>

      {/* Tip Card */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={tipIndex}
            custom={direction}
            initial={{ x: direction > 0 ? 200 : -200, opacity: 0, rotateY: direction > 0 ? 15 : -15 }}
            animate={{ x: 0, opacity: 1, rotateY: 0 }}
            exit={{ x: direction > 0 ? -200 : 200, opacity: 0, rotateY: direction > 0 ? -15 : 15 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className={`w-full ${currentTip.color} rounded-3xl p-8 relative overflow-hidden`}
          >
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/20 rounded-full translate-y-8 -translate-x-8" />

            <div className="relative">
              {/* Category */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-3xl">{currentTip.emoji}</span>
                <span className="text-xs font-medium tracking-wide text-persona-dark/70 bg-white/60 px-2.5 py-1 rounded-md">
                  {currentTip.category}
                </span>
              </div>

              {/* Quote */}
              <div className="mb-6 max-w-prose">
                <HiOutlineSparkles className="w-6 h-6 text-persona-dark/30 mb-3" />
                <p className="font-display text-2xl font-medium text-persona-dark leading-relaxed">
                  &ldquo;{currentTip.text}&rdquo;
                </p>
              </div>

              {/* Footer */}
              <p className="text-sm text-persona-muted">
                For <span className="font-medium text-persona-dark">{userName || 'Alex'}</span> · INTJ
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Next Tip Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex justify-center"
      >
        <motion.button
          onClick={nextTip}
          className="btn-primary flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <HiOutlineArrowPath className="w-5 h-5" />
          Next tip
        </motion.button>
      </motion.div>

      {/* Tip Counter */}
      <div className="flex justify-center gap-1.5 mt-4 mb-2">
        {tips.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === tipIndex ? 'bg-persona-dark w-6' : 'bg-persona-line w-1.5'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
