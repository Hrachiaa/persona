import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineUser, HiOutlineCalendarDays } from 'react-icons/hi2';
import { authApi } from '../api/auth';

const genderOptions = [
  { value: 'M', label: 'Male', emoji: '♂' },
  { value: 'F', label: 'Female', emoji: '♀' },
];

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
    id: 'gender',
    title: 'How do you identify?',
    subtitle: 'This helps us personalize your experience',
    icon: HiOutlineUser,
    type: 'gender',
    field: 'gender',
  },
  {
    id: 'birthDate',
    title: 'When were you born?',
    subtitle: 'This helps personalize your experience',
    icon: HiOutlineCalendarDays,
    placeholder: 'Enter your birth year (e.g. 1995)',
    type: 'number',
    field: 'birthDate',
  },
];

export default function Survey({ onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [profileData, setProfileData] = useState({ name: '', gender: '', birthDate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentStep = steps[step];

  const handleNext = async () => {
    if (step === steps.length - 1) {
      // Submit profile info to backend
      setIsLoading(true);
      setError(null);
      try {
        await authApi.addProfileInfo({
          name: profileData.name,
          gender: profileData.gender,
          birthDate: parseInt(profileData.birthDate, 10),
        });
        onComplete();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to save profile. Please try again.');
        setIsLoading(false);
      }
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
    setProfileData((prev) => ({ ...prev, [currentStep.field]: e.target.value }));
    setError(null);
  };

  const handleGenderSelect = (value) => {
    setProfileData((prev) => ({ ...prev, gender: value }));
    setError(null);
  };

  const isStepValid = () => {
    const val = profileData[currentStep.field];
    if (!val) return false;
    if (currentStep.field === 'birthDate') {
      const yr = parseInt(val, 10);
      return yr >= 1900 && yr <= 2026;
    }
    return true;
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      aria-label="Profile survey"
      className="min-h-dvh bg-persona-bg flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium tracking-wide text-persona-muted">
              Step {step + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-persona-dark tabular">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-persona-line rounded-full overflow-hidden">
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
              className="w-20 h-20 bg-persona-accent-peach/40 rounded-3xl flex items-center justify-center mx-auto mb-8"
              whileHover={{ scale: 1.05, rotate: 3 }}
            >
              <currentStep.icon className="w-10 h-10 text-persona-dark" />
            </motion.div>

            <h2 className="font-display text-3xl font-semibold text-persona-dark mb-2">
              {currentStep.title}
            </h2>
            <p className="text-persona-muted mb-8">{currentStep.subtitle}</p>

            {/* Input */}
            {currentStep.type === 'gender' ? (
              <div role="radiogroup" aria-label="Gender" className="flex gap-4 justify-center">
                {genderOptions.map((opt) => (
                  <motion.button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={profileData.gender === opt.value}
                    onClick={() => handleGenderSelect(opt.value)}
                    className={`flex-1 py-6 px-6 rounded-3xl border-2 transition-all duration-300 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${
                      profileData.gender === opt.value
                        ? 'border-persona-dark bg-persona-dark/5 shadow-warm'
                        : 'border-persona-line bg-white hover:border-persona-dark/20 hover:shadow-warm'
                    }`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="text-4xl block mb-3" aria-hidden="true">{opt.emoji}</span>
                    <span className={`font-medium text-lg ${
                      profileData.gender === opt.value ? 'text-persona-dark' : 'text-persona-muted'
                    }`}>
                      {opt.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="text-left">
                <label htmlFor={`survey-${currentStep.field}`} className="field-label sr-only">
                  {currentStep.title}
                </label>
                <input
                  id={`survey-${currentStep.field}`}
                  name={currentStep.field}
                  type={currentStep.type}
                  inputMode={currentStep.type === 'number' ? 'numeric' : 'text'}
                  placeholder={currentStep.placeholder}
                  value={profileData[currentStep.field]}
                  onChange={handleChange}
                  className={`input-field text-center text-lg ${currentStep.type === 'number' ? 'tabular' : ''}`}
                  autoFocus
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

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
            disabled={!isStepValid() || isLoading}
            className="btn-primary flex-1 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={isStepValid() && !isLoading ? { scale: 1.02 } : {}}
            whileTap={isStepValid() && !isLoading ? { scale: 0.97 } : {}}
          >
            {isLoading ? 'Saving…' : step === steps.length - 1 ? "Let's go" : 'Continue'}
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
