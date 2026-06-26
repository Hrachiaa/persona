import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlinePuzzlePiece, HiOutlineUserGroup, HiOutlineRocketLaunch } from 'react-icons/hi2';

// Visual config only — copy lives in the `onboarding` namespace, keyed by index.
const slides = [
  { icon: HiOutlineSparkles, color: 'bg-persona-accent-lavender' },
  { icon: HiOutlinePuzzlePiece, color: 'bg-persona-accent-yellow' },
  { icon: HiOutlineUserGroup, color: 'bg-persona-accent-pink' },
  { icon: HiOutlineRocketLaunch, color: 'bg-persona-accent-lime' },
];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export default function Onboarding({ onComplete }) {
  const { t } = useTranslation('onboarding');
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const goNext = () => {
    if (current === slides.length - 1) {
      onComplete();
    } else {
      setDirection(1);
      setCurrent((prev) => prev + 1);
    }
  };

  const goTo = (index) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  const slide = slides[current];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh bg-persona-bg flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <p className="text-2xl font-medium tracking-tight text-persona-dark flex items-center gap-2">
            <span className="font-display text-3xl">λ</span> Persona
          </p>
        </motion.div>

        {/* Slide Content */}
        <div className="w-full relative overflow-hidden" style={{ minHeight: '400px' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-col items-center text-center"
            >
              {/* Icon Circle */}
              <motion.div
                className={`w-40 h-40 ${slide.color} rounded-[2.5rem] flex items-center justify-center mb-10 shadow-warm-lg`}
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <slide.icon className="w-20 h-20 text-persona-dark/70" />
              </motion.div>

              {/* Text */}
              <h2 className="font-display text-4xl font-semibold text-persona-dark mb-4 leading-tight">
                {t(`slides.${current}.title`)}
              </h2>
              <p className="text-persona-muted text-lg leading-relaxed max-w-prose">
                {t(`slides.${current}.description`)}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mb-8 mt-8">
          {slides.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goTo(i)}
              aria-label={t('goToSlide', { n: i + 1 })}
              className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${
                i === current
                  ? 'bg-persona-dark w-8'
                  : 'bg-persona-line w-2.5 hover:bg-persona-muted/40'
              }`}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        {/* Button */}
        <motion.button
          onClick={goNext}
          className="btn-primary w-full max-w-xs text-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {current === slides.length - 1 ? t('getStarted') : t('next')}
        </motion.button>

        {/* Skip */}
        {current < slides.length - 1 && (
          <motion.button
            onClick={onComplete}
            className="mt-4 text-persona-muted text-sm hover:text-persona-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1 py-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('skip')}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
