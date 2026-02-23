import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineUser, HiOutlineCalendarDays } from 'react-icons/hi2';

const steps = [
  {
    id: 'name',
    title: "What's your name?",
    subtitle: "We'd love to know what to call you",
    icon: HiOutlineUser,
    placeholder: 'Enter your name',
    type: 'text',
    field: 'name',
  },
  {
    id: 'birthYear',
    title: 'When were you born?',
    subtitle: 'This helps personalize your experience',
    icon: HiOutlineCalendarDays,
    placeholder: 'Enter your birth year (e.g. 1995)',
    type: 'number',
    field: 'birthYear',
  },
];

export default function Survey({ userData, setUserData, onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const currentStep = steps[step];

  const handleNext = () => {
    if (step === steps.length - 1) {
      onComplete();
    } else {
      setDirection(1);
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((prev) => prev - 1);
    }
  };

  const handleChange = (e) => {
    setUserData((prev) => ({ ...prev, [currentStep.field]: e.target.value }));
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-persona-bg flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-persona-muted">
              Step {step + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-persona-dark">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-persona-dark rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ x: direction > 0 ? 200 : -200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -200 : 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="text-center"
          >
            {/* Icon */}
            <motion.div
              className="w-20 h-20 bg-persona-accent-lavender/50 rounded-3xl flex items-center justify-center mx-auto mb-8"
              whileHover={{ scale: 1.05, rotate: 3 }}
            >
              <currentStep.icon className="w-10 h-10 text-purple-600" />
            </motion.div>

            <h2 className="text-3xl font-bold text-persona-dark mb-2">
              {currentStep.title}
            </h2>
            <p className="text-persona-muted mb-8">{currentStep.subtitle}</p>

            {/* Input */}
            <div className="relative">
              <input
                type={currentStep.type}
                placeholder={currentStep.placeholder}
                value={userData[currentStep.field]}
                onChange={handleChange}
                className="input-field text-center text-lg"
                autoFocus
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex gap-3 mt-10">
          {step > 0 && (
            <motion.button
              onClick={handleBack}
              className="btn-secondary flex-1 text-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Back
            </motion.button>
          )}
          <motion.button
            onClick={handleNext}
            className="btn-primary flex-1 text-center text-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {step === steps.length - 1 ? "Let's Go!" : 'Continue'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
