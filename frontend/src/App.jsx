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

/** Check whether the user's profile fields are already populated */
function isProfileComplete(user) {
  return user && user.name && user.gender && user.birthDate;
}

/** Decide which screen to start on (called once after loading finishes) */
function getInitialScreen(user) {
  // Bug 3: skip onboarding if user has already seen it
  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

  if (user) {
    // Authenticated — go to Survey or Dashboard
    return isProfileComplete(user) ? SCREENS.DASHBOARD : SCREENS.SURVEY;
  }

  if (!hasSeenOnboarding) {
    return SCREENS.ONBOARDING;
  }

  // Bug 4: returning users land on Sign In, first-timers on Sign Up
  const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
  return hasVisitedBefore ? SCREENS.LOGIN : SCREENS.REGISTER;
}

export default function App() {
  const { user, loading, handleGoogleCallback, fetchMe, logout } = useAuth();
  const [screen, setScreen] = useState(null); // null until init logic runs
  const [googleHandled, setGoogleHandled] = useState(false);

  // Bug 1: Handle Google OAuth callback — extract tokens from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId = params.get('userId');

    if (accessToken && refreshToken && userId) {
      // Clean up URL immediately
      window.history.replaceState({}, document.title, window.location.pathname);

      handleGoogleCallback({ accessToken, refreshToken, userId }).then((me) => {
        // Mark as visited for Bug 4
        localStorage.setItem('hasVisitedBefore', 'true');
        localStorage.setItem('hasSeenOnboarding', 'true');
        // Bug 2: skip Survey if profile already complete
        if (isProfileComplete(me)) {
          setScreen(SCREENS.DASHBOARD);
        } else {
          setScreen(SCREENS.SURVEY);
        }
        setGoogleHandled(true);
      });
    } else {
      setGoogleHandled(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once loading finishes and Google callback is handled, pick the initial screen
  useEffect(() => {
    if (!loading && googleHandled && screen === null) {
      setScreen(getInitialScreen(user));
    }
  }, [loading, googleHandled, user, screen]);

  // Show loading spinner while auth is being resolved
  if (loading || !googleHandled || screen === null) {
    return (
      <div className="min-h-screen bg-persona-bg flex items-center justify-center">
        <div className="animate-pulse-soft text-2xl font-bold text-persona-dark flex items-center gap-2">
          <span className="text-3xl">λ</span> Persona
        </div>
      </div>
    );
  }

  const navigate = (to) => setScreen(to);

  /** Called after successful signup or login */
  const handleAuthComplete = () => {
    localStorage.setItem('hasVisitedBefore', 'true');
    // Bug 2: check if profile data is already filled via the user from context
    if (isProfileComplete(user)) {
      navigate(SCREENS.DASHBOARD);
    } else {
      navigate(SCREENS.SURVEY);
    }
  };

  /** Called after survey completes */
  const handleSurveyComplete = async () => {
    // Refresh user data so we have the latest profile
    await fetchMe();
    navigate(SCREENS.DASHBOARD);
  };

  return (
    <div className="min-h-screen bg-persona-bg">
      <AnimatePresence mode="wait">
        {screen === SCREENS.ONBOARDING && (
          <Onboarding
            key="onboarding"
            onComplete={() => {
              // Bug 3: persist flag so onboarding never shows again
              localStorage.setItem('hasSeenOnboarding', 'true');
              // Bug 4: first-timers go to Sign Up
              const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
              navigate(user ? (isProfileComplete(user) ? SCREENS.DASHBOARD : SCREENS.SURVEY) : (hasVisitedBefore ? SCREENS.LOGIN : SCREENS.REGISTER));
            }}
          />
        )}
        {screen === SCREENS.REGISTER && (
          <Register
            key="register"
            onComplete={handleAuthComplete}
            onLogin={() => navigate(SCREENS.LOGIN)}
          />
        )}
        {screen === SCREENS.LOGIN && (
          <Login
            key="login"
            onComplete={handleAuthComplete}
            onLogin={() => navigate(SCREENS.LOGIN)}
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
            onComplete={handleSurveyComplete}
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
