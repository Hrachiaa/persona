import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Onboarding from './pages/Onboarding';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Survey from './pages/Survey';
import Dashboard from './pages/Dashboard';
import SharePage from './pages/SharePage';
import InvitePage from './pages/InvitePage';
import { friendsApi } from './api/friends';
import ProgressiveBlur from './components/ProgressiveBlur';

// Dashboard tab routes (+ the profile overlay) all render the same Dashboard
// layout. They share a single AnimatePresence key so switching tabs doesn't
// re-animate the shell — Dashboard handles its own tab + sub-route transitions.
// `/tests` and `/profile` have nested sub-routes (test runner / result, profile
// sub-pages), so they match on a prefix; the rest are leaf tabs.
const DASHBOARD_PREFIXES = ['/tests', '/portrait', '/match', '/reads', '/chat', '/profile'];
const DASHBOARD_ROUTES = ['/tests/*', '/portrait', '/match/*', '/reads', '/chat/*', '/profile/*'];
const isDashboardPath = (p) => DASHBOARD_PREFIXES.some((base) => p === base || p.startsWith(base + '/'));

/** Check whether the user's profile fields are already populated */
function isProfileComplete(user) {
  return user && user.name && user.gender && user.birthDate;
}

/**
 * If the visitor arrived via an invite link before signing in, finish the invite
 * now (fire-and-forget) and clear the flag. Returns true if one was pending, so the
 * caller can land them on the Friends tab.
 */
function consumePendingInvite() {
  const token = localStorage.getItem('pendingInvite');
  if (!token) return false;
  localStorage.removeItem('pendingInvite');
  friendsApi.acceptInvite(token).catch(() => {});
  return true;
}

/** Decide where a visitor hitting `/` should land (mirrors the old getInitialScreen) */
function getInitialPath(user) {
  // Bug 3: skip onboarding if user has already seen it
  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

  if (user) {
    // Authenticated — go to Survey or Dashboard
    return isProfileComplete(user) ? '/tests' : '/survey';
  }

  if (!hasSeenOnboarding) {
    return '/onboarding';
  }

  // Bug 4: returning users land on Sign In, first-timers on Sign Up
  const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
  return hasVisitedBefore ? '/login' : '/register';
}

export default function App() {
  const { user, loading, handleGoogleCallback, fetchMe, logout } = useAuth();
  const [googleHandled, setGoogleHandled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Bug 1: Handle Google OAuth callback — extract tokens from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId = params.get('userId');

    if (accessToken && refreshToken && userId) {
      handleGoogleCallback({ accessToken, refreshToken, userId }).then((me) => {
        // Mark as visited for Bug 4
        localStorage.setItem('hasVisitedBefore', 'true');
        localStorage.setItem('hasSeenOnboarding', 'true');
        const hadInvite = consumePendingInvite();
        // Bug 2: skip Survey if profile already complete (replace so the
        // token-laden callback URL doesn't end up in history)
        navigate(
          isProfileComplete(me) ? (hadInvite ? '/match' : '/tests') : '/survey',
          { replace: true },
        );
        setGoogleHandled(true);
      });
    } else {
      setGoogleHandled(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading spinner while auth is being resolved
  if (loading || !googleHandled) {
    return (
      <div className="min-h-dvh bg-persona-bg grain flex items-center justify-center">
        <div className="animate-pulse-soft text-2xl font-medium text-persona-dark flex items-center gap-2 relative">
          <span className="font-display text-3xl">λ</span> Persona
        </div>
      </div>
    );
  }

  /** Called after successful signup or login — me is the fresh /auth/me response */
  const handleAuthComplete = (me) => {
    localStorage.setItem('hasVisitedBefore', 'true');
    const hadInvite = consumePendingInvite();
    // Use the fresh user data passed in, not the stale React state
    if (!isProfileComplete(me)) return navigate('/survey');
    navigate(hadInvite ? '/match' : '/tests');
  };

  /** Called after survey completes */
  const handleSurveyComplete = async () => {
    // Refresh user data so we have the latest profile
    await fetchMe();
    navigate('/tests');
  };

  /** Onboarding finished — persist the flag and route on (Bug 3 / Bug 4) */
  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    navigate(
      user
        ? (isProfileComplete(user) ? '/tests' : '/survey')
        : (hasVisitedBefore ? '/login' : '/register')
    );
  };

  // Routes that require an authenticated user fall back to the login screen.
  const requireAuth = (element) => (user ? element : <Navigate to="/login" replace />);

  const isDashboardRoute = isDashboardPath(location.pathname);
  const animKey = isDashboardRoute ? 'dashboard' : location.pathname;

  return (
    <div className="min-h-dvh bg-persona-bg grain">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:btn-primary"
      >
        Skip to content
      </a>
      <main id="main" className="relative">
        {/* Top progressive blur — matches the Dashboard. Dashboard renders its own
            (immersive-aware) instance, so skip it on dashboard routes. */}
        {!isDashboardRoute && (
          <ProgressiveBlur direction="down" className="fixed top-0 inset-x-0 h-28 z-40" />
        )}
        <AnimatePresence mode="wait">
          <Routes location={location} key={animKey}>
            <Route path="/" element={<Navigate to={getInitialPath(user)} replace />} />
            {/* Public shared result — viewable without an account. */}
            <Route path="/share/:token" element={<SharePage />} />
            {/* Personal invite link — adds the opener as a friend (auth-gated inside). */}
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route
              path="/onboarding"
              element={<Onboarding onComplete={handleOnboardingComplete} />}
            />
            <Route
              path="/register"
              element={<Register onComplete={handleAuthComplete} onLogin={() => navigate('/login')} />}
            />
            <Route
              path="/login"
              element={
                <Login
                  onComplete={handleAuthComplete}
                  onRegister={() => navigate('/register')}
                  onForgotPassword={() => navigate('/forgot-password')}
                />
              }
            />
            <Route
              path="/forgot-password"
              element={<ForgotPassword onBack={() => navigate('/login')} />}
            />
            <Route
              path="/survey"
              element={requireAuth(<Survey onComplete={handleSurveyComplete} />)}
            />
            {DASHBOARD_ROUTES.map((path) => (
              <Route
                key={path}
                path={path}
                element={requireAuth(
                  <Dashboard
                    onLogout={async () => {
                      await logout();
                      navigate('/login');
                    }}
                  />
                )}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}
