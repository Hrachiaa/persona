import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineCalendarDays, HiOutlineSparkles } from 'react-icons/hi2';

// Visual config only — category labels and tip text live in the `advice` namespace.
const tipStyles = [
  { emoji: '🧘', color: 'bg-persona-accent-lavender/40' },
  { emoji: '💬', color: 'bg-persona-accent-blue/40' },
  { emoji: '🚀', color: 'bg-persona-accent-yellow/40' },
  { emoji: '🌱', color: 'bg-persona-accent-lime/40' },
  { emoji: '🦉', color: 'bg-persona-accent-pink/40' },
  { emoji: '❤️', color: 'bg-persona-accent-peach/40' },
];

export default function DailyAdvice({ userName }) {
  const { t, i18n } = useTranslation('advice');
  // `?tip=N` keeps the current card position in the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const [direction, setDirection] = useState(1);

  const tips = t('tips', { returnObjects: true });
  const today = new Date().toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rawTip = Number(searchParams.get('tip'));
  const tipIndex = Number.isInteger(rawTip) && rawTip >= 0 ? rawTip % tips.length : 0;
  const currentTip = tips[tipIndex];
  const style = tipStyles[tipIndex];

  const nextTip = () => {
    setDirection(1);
    setSearchParams({ tip: String((tipIndex + 1) % tips.length) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-2 pb-6 min-h-[calc(100dvh-80px)] flex flex-col"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="font-display text-4xl font-semibold text-persona-dark mb-1">{t('title')}</h1>
        <p className="text-persona-muted">{t('subtitle')}</p>
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
            className={`w-full ${style.color} rounded-3xl p-8 relative overflow-hidden`}
          >
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/20 rounded-full translate-y-8 -translate-x-8" />

            <div className="relative">
              {/* Category */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-3xl">{style.emoji}</span>
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
                {t('for')} <span className="font-medium text-persona-dark">{userName || 'Alex'}</span> · INTJ
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
          {t('nextTip')}
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
