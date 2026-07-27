import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';

// The shared email+password screen behind both /login and /register — the two
// differ only in copy, the auth call and one "forgot password?" link, so the
// mode picks those. Thin wrappers live in Login.jsx / Register.jsx.
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/** Underlined inline link for the sign-up consent line. */
function LegalLink({ to, children }) {
  return (
    <Link to={to} className="underline underline-offset-2 hover:text-persona-dark">
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AuthScreen({ mode, onComplete, onSwitch, onForgotPassword }) {
  const { t } = useTranslation('auth');
  const { login, signup, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === 'login';
  const authenticate = isLogin ? login : signup;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const me = await authenticate(email, password);
      onComplete(me);
    } catch {
      // error is set in context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-dvh bg-persona-bg flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-10"
        >
          <p className="text-2xl font-medium tracking-tight text-persona-dark flex items-center justify-center gap-2 mb-6">
            <span className="font-display text-3xl">λ</span> Persona
          </p>
          <h1 className="font-display text-4xl font-semibold text-persona-dark mb-2">{t(`${mode}.title`)}</h1>
          <p className="text-persona-muted">{t(`${mode}.subtitle`)}</p>
        </motion.header>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Email */}
          <div>
            <label htmlFor={`${mode}-email`} className="field-label">{t('emailLabel')}</label>
            <div className="relative">
              <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id={`${mode}-email`}
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                className="input-field pl-12"
                required
              />
            </div>
          </div>

          {/* Password — sign-up hints at the rules and enforces the length */}
          <div>
            <label htmlFor={`${mode}-password`} className="field-label">{t('passwordLabel')}</label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id={`${mode}-password`}
                name={isLogin ? 'password' : 'new-password'}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder={isLogin ? t('passwordPlaceholder') : t('passwordHint')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                className="input-field pl-12 pr-12"
                {...(isLogin ? {} : { minLength: 8, maxLength: 32 })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach rounded-full p-0.5"
              >
                {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-persona-muted hover:text-persona-dark transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1"
              >
                {t('login.forgotPassword')}
              </button>
            </div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full text-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isLoading ? { scale: 1.02 } : {}}
            whileTap={!isLoading ? { scale: 0.97 } : {}}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> {t(`${mode}.submitting`)}
              </span>
            ) : t(`${mode}.submit`)}
          </motion.button>
        </motion.form>

        {/* Sign-up is where the agreement is actually formed, so the consent
            line lives here rather than on the login form. */}
        {!isLogin && (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-persona-muted/80">
            <Trans
              t={t}
              i18nKey="register.legalNote"
              components={{
                terms: <LegalLink to="/terms" />,
                privacy: <LegalLink to="/privacy" />,
              }}
            />
          </p>
        )}

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 my-8"
        >
          <div className="flex-1 h-px bg-persona-line" />
          <span className="text-sm text-persona-muted">{t('orContinueWith')}</span>
          <div className="flex-1 h-px bg-persona-line" />
        </motion.div>

        {/* Google Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={handleGoogleLogin}
            className="btn-secondary w-full text-center py-3 flex items-center justify-center gap-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <GoogleIcon />
            Google
          </motion.button>
        </motion.div>

        {/* Footer — switch to the other mode */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-persona-muted mt-8"
        >
          {t(isLogin ? 'login.noAccount' : 'register.haveAccount')}{' '}
          <button
            onClick={onSwitch}
            className="text-persona-dark font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded px-1"
          >
            {t(isLogin ? 'login.signUp' : 'register.signIn')}
          </button>
        </motion.p>
      </div>
    </motion.section>
  );
}
