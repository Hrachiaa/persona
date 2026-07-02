import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineUser, HiOutlineCalendarDays } from 'react-icons/hi2';
import { authApi } from '../api/auth';
import i18n, { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { GENDER_OPTIONS, BIRTH_YEAR_MIN, maxBirthYear } from '../utils/constants';

const steps = [
  { id: 'name', icon: HiOutlineUser, type: 'text', field: 'name' },
  { id: 'gender', icon: HiOutlineUser, type: 'gender', field: 'gender' },
  { id: 'birthDate', icon: HiOutlineCalendarDays, type: 'number', field: 'birthDate' },
];

export default function Survey({ onComplete }) {
  const { t } = useTranslation('survey');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [profileData, setProfileData] = useState({
    name: '',
    gender: '',
    birthDate: '',
    language: i18n.language,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentStep = steps[step];

  // Language is chosen on the first (name) step and applied to the UI immediately,
  // so the rest of the survey is shown in the selected language. It's persisted to
  // the account together with the rest of the profile on submit.
  const handleLanguageChange = (code) => {
    setProfileData((prev) => ({ ...prev, language: code }));
    setLanguage(code);
  };

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
          language: profileData.language,
        });
        onComplete();
      } catch (err) {
        setError(err.response?.data?.message || t('saveError'));
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
      return yr >= BIRTH_YEAR_MIN && yr <= maxBirthYear();
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
      aria-label={t('aria')}
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
              {t('stepOf', { n: step + 1, total: steps.length })}
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
              {t(`steps.${currentStep.id}.title`)}
            </h2>
            <p className="text-persona-muted mb-8">{t(`steps.${currentStep.id}.subtitle`)}</p>

            {/* Input */}
            {currentStep.type === 'gender' ? (
              <div role="radiogroup" aria-label="Gender" className="flex gap-4 justify-center">
                {GENDER_OPTIONS.map((opt) => (
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
                      {t(opt.labelKey)}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="text-left">
                <label htmlFor={`survey-${currentStep.field}`} className="field-label sr-only">
                  {t(`steps.${currentStep.id}.title`)}
                </label>
                <input
                  id={`survey-${currentStep.field}`}
                  name={currentStep.field}
                  type={currentStep.type}
                  inputMode={currentStep.type === 'number' ? 'numeric' : 'text'}
                  placeholder={t(`steps.${currentStep.id}.placeholder`)}
                  value={profileData[currentStep.field]}
                  onChange={handleChange}
                  className={`input-field text-center text-lg ${currentStep.type === 'number' ? 'tabular' : ''}`}
                  autoFocus
                />
              </div>
            )}

            {/* Language chooser — shown on the first (name) step. Applies immediately
                and is saved with the profile. */}
            {currentStep.id === 'name' && (
              <div className="mt-8">
                <p className="field-label text-center">{t('languagePrompt')}</p>
                <div role="radiogroup" aria-label={t('languagePrompt')} className="inline-flex w-full p-1 bg-white shadow-warm rounded-full">
                  {SUPPORTED_LANGUAGES.map((l) => {
                    const active = profileData.language === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handleLanguageChange(l.code)}
                        className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach ${
                          active ? 'bg-persona-dark text-white' : 'text-persona-muted hover:text-persona-dark'
                        }`}
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </div>
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
              {t('common:back')}
            </motion.button>
          )}
          <motion.button
            onClick={handleNext}
            disabled={!isStepValid() || isLoading}
            className="btn-primary flex-1 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={isStepValid() && !isLoading ? { scale: 1.02 } : {}}
            whileTap={isStepValid() && !isLoading ? { scale: 0.97 } : {}}
          >
            {isLoading ? t('common:saving') : step === steps.length - 1 ? t('letsGo') : t('common:continue')}
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
