import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlinePuzzlePiece, HiOutlineUserGroup, HiOutlineRocketLaunch } from 'react-icons/hi2';

const slides = [
  {
    icon: HiOutlineSparkles,
    color: 'bg-persona-accent-lavender',
    title: 'Discover Who You Are',
    description: 'Take scientifically-inspired personality tests and uncover the traits that make you unique.',
  },
  {
    icon: HiOutlinePuzzlePiece,
    color: 'bg-persona-accent-yellow',
    title: 'Deep Personality Insights',
    description: 'Get detailed analysis of your strengths, risk zones, and behavioral patterns.',
  },
  {
    icon: HiOutlineUserGroup,
    color: 'bg-persona-accent-pink',
    title: 'Check Compatibility',
    description: 'See how well you match with friends, partners, or colleagues based on personality type.',
  },
  {
    icon: HiOutlineRocketLaunch,
    color: 'bg-persona-accent-lime',
    title: 'Grow Every Day',
    description: 'Receive personalized book & film recommendations and daily advice tailored to your personality.',
  },
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
      className="min-h-screen bg-persona-bg flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold tracking-tight text-persona-dark flex items-center gap-2">
            <span className="text-3xl">λ</span> Persona
          </h1>
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
                className={`w-40 h-40 ${slide.color} rounded-[2.5rem] flex items-center justify-center mb-10 shadow-lg`}
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <slide.icon className="w-20 h-20 text-persona-dark/70" />
              </motion.div>

              {/* Text */}
              <h2 className="text-3xl font-bold text-persona-dark mb-4 leading-tight">
                {slide.title}
              </h2>
              <p className="text-persona-muted text-lg leading-relaxed max-w-sm">
                {slide.description}
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
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-persona-dark w-8'
                  : 'bg-gray-300 w-2.5 hover:bg-gray-400'
              }`}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        {/* Button */}
        <motion.button
          onClick={goNext}
          className="btn-primary w-full max-w-xs text-center text-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {current === slides.length - 1 ? 'Get Started' : 'Next'}
        </motion.button>

        {/* Skip */}
        {current < slides.length - 1 && (
          <motion.button
            onClick={onComplete}
            className="mt-4 text-persona-muted text-sm hover:text-persona-dark transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Skip
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
