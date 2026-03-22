import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineArrowLeft,
} from 'react-icons/hi2';
import { authApi } from '../api/auth';

const STEPS = {
  EMAIL: 0,
  CODE: 1,
  NEW_PASSWORD: 2,
  SUCCESS: 3,
};

export default function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setStep(STEPS.CODE);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPasswordCode(email, code);
      setStep(STEPS.NEW_PASSWORD);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8 || newPassword.length > 32) {
      setError('Password must be between 8 and 32 characters.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.changeForgottenPassword(email, code, newPassword);
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepConfig = [
    {
      title: 'Reset Password',
      subtitle: 'Enter your email and we\'ll send you a verification code',
      icon: HiOutlineEnvelope,
    },
    {
      title: 'Enter Verification Code',
      subtitle: `We've sent a 6-digit code to ${email}`,
      icon: HiOutlineShieldCheck,
    },
    {
      title: 'New Password',
      subtitle: 'Choose a strong password for your account',
      icon: HiOutlineLockClosed,
    },
    {
      title: 'Password Changed!',
      subtitle: 'Your password has been reset successfully',
      icon: HiOutlineCheckCircle,
    },
  ];

  const current = stepConfig[step];
  const progress = ((step + 1) / stepConfig.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-persona-bg flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md">
        {/* Back Button */}
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-persona-muted hover:text-persona-dark transition-colors mb-8"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to login</span>
        </motion.button>

        {/* Progress Bar */}
        {step < STEPS.SUCCESS && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-persona-muted">
                Step {step + 1} of 3
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-persona-dark rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Icon & Header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-8"
          >
            <motion.div
              className="w-20 h-20 bg-persona-accent-lavender/50 rounded-3xl flex items-center justify-center mx-auto mb-6"
              whileHover={{ scale: 1.05, rotate: 3 }}
            >
              <current.icon className="w-10 h-10 text-purple-600" />
            </motion.div>
            <h2 className="text-3xl font-bold text-persona-dark mb-2">{current.title}</h2>
            <p className="text-persona-muted">{current.subtitle}</p>
          </motion.div>
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === STEPS.EMAIL && (
            <motion.form
              key="email-form"
              onSubmit={handleSendEmail}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              <div className="relative">
                <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="input-field pl-12"
                  required
                  autoFocus
                />
              </div>
              <motion.button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full text-center text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.97 } : {}}
              >
                {isLoading ? 'Sending…' : 'Send Code'}
              </motion.button>
            </motion.form>
          )}

          {step === STEPS.CODE && (
            <motion.form
              key="code-form"
              onSubmit={handleVerifyCode}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              <div className="relative">
                <HiOutlineShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(val);
                    setError(null);
                  }}
                  className="input-field pl-12 text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <motion.button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="btn-primary w-full text-center text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.97 } : {}}
              >
                {isLoading ? 'Verifying…' : 'Verify Code'}
              </motion.button>
              <button
                type="button"
                onClick={() => { setStep(STEPS.EMAIL); setError(null); }}
                className="w-full text-center text-sm text-persona-muted hover:text-persona-dark transition-colors mt-2"
              >
                Didn&apos;t receive a code? Try again
              </button>
            </motion.form>
          )}

          {step === STEPS.NEW_PASSWORD && (
            <motion.form
              key="password-form"
              onSubmit={handleChangePassword}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password (8-32 characters)"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                  className="input-field pl-12 pr-12"
                  minLength={8}
                  maxLength={32}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password strength hint */}
              <p className="text-xs text-persona-muted px-1">
                Must be between 8 and 32 characters long
              </p>
              <motion.button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full text-center text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.97 } : {}}
              >
                {isLoading ? 'Changing…' : 'Change Password'}
              </motion.button>
            </motion.form>
          )}

          {step === STEPS.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.button
                onClick={onBack}
                className="btn-primary w-full text-center text-lg mt-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Back to Sign In
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
