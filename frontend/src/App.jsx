import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Onboarding from './pages/Onboarding';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Survey from './pages/Survey';
import Dashboard from './pages/Dashboard';

const SCREENS = {
  ONBOARDING: 'onboarding',
  REGISTER: 'register',
  LOGIN: 'login',
  FORGOT_PASSWORD: 'forgot_password',
  SURVEY: 'survey',
  DASHBOARD: 'dashboard',
};

export default function App() {
  const { user, loading, handleGoogleCallback, logout } = useAuth();
  const [screen, setScreen] = useState(SCREENS.ONBOARDING);

  // Handle Google OAuth callback — check URL for tokens
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId = params.get('userId');

    if (accessToken && refreshToken && userId) {
      handleGoogleCallback({ accessToken, refreshToken, userId });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setScreen(SCREENS.SURVEY);
    }
  }, [handleGoogleCallback]);

  // If user is authenticated, jump past auth screens
  useEffect(() => {
    if (user && (screen === SCREENS.ONBOARDING || screen === SCREENS.REGISTER || screen === SCREENS.LOGIN)) {
      setScreen(SCREENS.SURVEY);
    }
  }, [user, screen]);

  // Show nothing while loading stored auth
  if (loading) {
    return (
      <div className="min-h-screen bg-persona-bg flex items-center justify-center">
        <div className="animate-pulse-soft text-2xl font-bold text-persona-dark flex items-center gap-2">
          <span className="text-3xl">λ</span> Persona
        </div>
      </div>
    );
  }

  const navigate = (to) => setScreen(to);

  return (
    <div className="min-h-screen bg-persona-bg">
      <AnimatePresence mode="wait">
        {screen === SCREENS.ONBOARDING && (
          <Onboarding
            key="onboarding"
            onComplete={() => navigate(user ? SCREENS.SURVEY : SCREENS.REGISTER)}
          />
        )}
        {screen === SCREENS.REGISTER && (
          <Register
            key="register"
            onComplete={() => navigate(SCREENS.SURVEY)}
            onLogin={() => navigate(SCREENS.LOGIN)}
          />
        )}
        {screen === SCREENS.LOGIN && (
          <Login
            key="login"
            onComplete={() => navigate(SCREENS.SURVEY)}
            onRegister={() => navigate(SCREENS.REGISTER)}
            onForgotPassword={() => navigate(SCREENS.FORGOT_PASSWORD)}
          />
        )}
        {screen === SCREENS.FORGOT_PASSWORD && (
          <ForgotPassword
            key="forgot_password"
            onBack={() => navigate(SCREENS.LOGIN)}
          />
        )}
        {screen === SCREENS.SURVEY && (
          <Survey
            key="survey"
            onComplete={() => navigate(SCREENS.DASHBOARD)}
          />
        )}
        {screen === SCREENS.DASHBOARD && (
          <Dashboard
            key="dashboard"
            onLogout={async () => {
              await logout();
              navigate(SCREENS.LOGIN);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
