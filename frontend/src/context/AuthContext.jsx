import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import i18n, { LANG_KEY, SUPPORTED_LANGUAGES } from '../i18n';
const AuthContext = createContext(null);

// Apply a user's stored language preference to the UI (and remember it locally).
function applyUserLanguage(user) {
  const code = user?.language;
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
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const persistAuth = useCallback((data) => {
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
      const data = await authApi.signup(email, password);
      persistAuth(data);
      // Fetch full profile after signup
      const me = await fetchMe();
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
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
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}