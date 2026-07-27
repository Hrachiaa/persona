import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Survey from './pages/Survey';
import Dashboard from './pages/Dashboard';
import { friendsApi } from './api/friends';
import ProgressiveBlur from './components/ProgressiveBlur';
import Toaster from './components/Toast';

// Standalone public pages — split out of the main bundle (SharePage pulls in the
// whole result-screen suite, which anonymous visitors of / never need).
const SharePage = lazy(() => import('./pages/SharePage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const Legal = lazy(() => import('./pages/Legal'));
const Pricing = lazy(() => import('./pages/Pricing'));

// Dashboard tab routes (+ the profile overlay) all render the same Dashboard
// layout. They share a single AnimatePresence key so switching tabs doesn't
// re-animate the shell — Dashboard handles its own tab + sub-route transitions.
// `/tests` and `/profile` have nested sub-routes (test runner / result, profile
// sub-pages), so they match on a prefix; the rest are leaf tabs.
const DASHBOARD_PREFIXES = ['/tests', '/portrait', '/match', '/reads', '/chat', '/profile'];
const DASHBOARD_ROUTES = ['/tests/*', '/portrait', '/match/*', '/reads', '/chat/*', '/profile/*'];
const isDashboardPath = (p) => DASHBOARD_PREFIXES.some((base) => p === base || p.startsWith(base + '/'));

// Non-dashboard routes that bring their own top chrome and must not get the
// app-level progressive blur (it would only add empty space above their header).
const CHROMELESS_PATHS = new Set(['/welcome', '/pricing', '/terms', '/privacy', '/refunds']);

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
  // Set once the intro has been seen (onboarding completed / Google OAuth);
  // until then anonymous visitors land on the marketing page.
  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

  if (user) {
    // Authenticated — go to Survey or Dashboard (Portrait is the home tab now)
    return isProfileComplete(user) ? '/portrait' : '/survey';
  }

  if (!hasSeenOnboarding) {
    return '/welcome';
  }

  // Returning visitors land on Sign In, first-timers on Sign Up.
  const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
  return hasVisitedBefore ? '/login' : '/register';
}

/** Google OAuth callback tokens, if this load is the OAuth redirect. */
function googleCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  const userId = params.get('userId');
  return accessToken && refreshToken && userId ? { accessToken, refreshToken, userId } : null;
}

export default function App() {
  const { user, loading, handleGoogleCallback, fetchMe, logout } = useAuth();
  // False only while consuming a Google OAuth redirect (tokens in the URL) —
  // initialized from the URL so the non-OAuth case needs no state update.
  const [googleHandled, setGoogleHandled] = useState(() => !googleCallbackParams());
  const navigate = useNavigate();
  const location = useLocation();

  // Consume the Google OAuth callback: persist the tokens, fetch the profile,
  // then route on (replace, so the token-laden URL doesn't end up in history).
  useEffect(() => {
    const params = googleCallbackParams();
    if (!params) return;
    handleGoogleCallback(params).then((me) => {
      localStorage.setItem('hasVisitedBefore', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
      const hadInvite = consumePendingInvite();
      // Straight to the dashboard when the profile is already filled in;
      // first-time Google users still get the survey.
      navigate(
        isProfileComplete(me) ? (hadInvite ? '/match' : '/portrait') : '/survey',
        { replace: true },
      );
      setGoogleHandled(true);
    });
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
    navigate(hadInvite ? '/match' : '/portrait');
  };

  /** Called after survey completes */
  const handleSurveyComplete = async () => {
    // Refresh user data so we have the latest profile
    await fetchMe();
    navigate('/portrait');
  };

  /** Onboarding finished — persist the flag and route on (Bug 3 / Bug 4) */
  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    navigate(
      user
        ? (isProfileComplete(user) ? '/portrait' : '/survey')
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
            (immersive-aware) instance, so skip it on dashboard routes; the landing
            has its own sticky glass header instead, and the legal pages are plain
            documents that would just gain dead space above the title. */}
        {!isDashboardRoute && !CHROMELESS_PATHS.has(location.pathname) && (
          <ProgressiveBlur direction="down" className="fixed top-0 inset-x-0 h-28 z-40" />
        )}
        <Suspense
          fallback={
            <div className="min-h-dvh flex items-center justify-center">
              <div className="animate-pulse-soft text-persona-muted">…</div>
            </div>
          }
        >
        <AnimatePresence mode="wait">
          <Routes location={location} key={animKey}>
            <Route path="/" element={<Navigate to={getInitialPath(user)} replace />} />
            {/* Public marketing page — the front door for new anonymous visitors. */}
            <Route path="/welcome" element={<Landing />} />
            {/* Pricing + legal documents. Public and un-gated on purpose —
                Paddle's verification crawls them anonymously, and the paywall
                links here. */}
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/terms" element={<Legal doc="terms" />} />
            <Route path="/privacy" element={<Legal doc="privacy" />} />
            <Route path="/refunds" element={<Legal doc="refunds" />} />
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
            {/* The standalone test list is retired — Portrait is the home/browse tab.
                The runner & result still live under /tests/:slug[/result] (driven from
                Portrait); only the bare list path redirects there. */}
            <Route path="/tests" element={<Navigate to="/portrait" replace />} />
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
        </Suspense>
      </main>
      {/* Fire-and-forget action-failure toasts (see components/Toast). */}
      <Toaster />
    </div>
  );
}
