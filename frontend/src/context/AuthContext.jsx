import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import i18n, { LANG_KEY, SUPPORTED_LANGUAGES } from '../i18n';
import { resetSessionCaches } from '../utils/sessionCaches';
import posthog from 'posthog-js';
const AuthContext = createContext(null);

// Apply a user's stored language preference to the UI (and remember it locally).
// While the profile survey is still pending, the account's language is just the
// server default — the locally chosen pre-login language keeps priority until
// the survey persists a real choice (fixes the RU signup → EN survey flip).
function applyUserLanguage(user) {
  const code = user?.language;
  const profilePending = user && !(user.name && user.gender && user.birthDate);
  if (profilePending && localStorage.getItem(LANG_KEY)) return;
  if (code && SUPPORTED_LANGUAGES.some((l) => l.code === code) && i18n.language !== code) {
    localStorage.setItem(LANG_KEY, code);
    i18n.changeLanguage(code);
  }
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // full user object from /auth/me
  const [loading, setLoading] = useState(true);  // true while checking stored tokens
  const [error, setError] = useState(null);

  // Fetch full user profile from /auth/me
  const fetchMe = useCallback(async () => {
    try {
      const data = await authApi.getMe();
      setUser(data);
      applyUserLanguage(data);
      return data;
    } catch {
      // Token invalid or expired — clear auth
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      setUser(null);
      return null;
    }
  }, []);

  // On mount, check if we have valid tokens and fetch user profile
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken && refreshToken) {
      fetchMe()
        .then((me) => {
          if (me?.id) posthog.identify(me.id, { language: me.language });
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const persistAuth = useCallback((data) => {
    // A new auth session begins — drop anything cached for the previous account.
    resetSessionCaches();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.userId) {
      localStorage.setItem('userId', data.userId);
    }
    setError(null);
  }, []);

  const signup = useCallback(async (email, password) => {
    try {
      setError(null);
      // Seed the account with the language the signup screen was shown in
      // (only ever a supported code — the backend rejects anything else).
      const uiLang = i18n.language?.split('-')[0];
      const language = SUPPORTED_LANGUAGES.some((l) => l.code === uiLang) ? uiLang : undefined;
      const data = await authApi.signup(email, password, language);
      persistAuth(data);
      // Fetch full profile after signup
      const me = await fetchMe();
      if (me?.id) {
        posthog.identify(me.id, { language: me.language });
        posthog.capture('user_signed_up', { method: 'email' });
      }
      return me;
    } catch (err) {
      const message = err.response?.data?.message || i18n.t('auth:signupFailed');
      setError(message);
      throw err;
    }
  }, [persistAuth, fetchMe]);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const data = await authApi.login(email, password);
      persistAuth(data);
      // Fetch full profile after login
      const me = await fetchMe();
      if (me?.id) {
        posthog.identify(me.id, { language: me.language });
        posthog.capture('user_logged_in', { method: 'email' });
      }
      return me;
    } catch (err) {
      const message = err.response?.data?.message || i18n.t('auth:loginFailed');
      setError(message);
      throw err;
    }
  }, [persistAuth, fetchMe]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Ignore errors on logout — clear local state anyway
    } finally {
      posthog.reset();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      resetSessionCaches();
      setUser(null);
      setError(null);
    }
  }, []);

  const handleGoogleCallback = useCallback(async (params) => {
    const { accessToken, refreshToken, userId } = params;
    if (accessToken && refreshToken && userId) {
      persistAuth({ accessToken, refreshToken, userId });
      // Fetch full profile after Google auth
      const me = await fetchMe();
      if (me?.id) {
        posthog.identify(me.id, { language: me.language });
        posthog.capture('user_logged_in_google', { method: 'google' });
      }
      return me;
    }
    return null;
  }, [persistAuth, fetchMe]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signup,
        login,
        logout,
        handleGoogleCallback,
        fetchMe,
        persistAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components -- the provider and its hook belong together; fast-refresh reloading this file wholesale is fine
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}