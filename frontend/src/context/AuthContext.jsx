import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { userId }
  const [loading, setLoading] = useState(true);  // true while checking stored tokens
  const [error, setError] = useState(null);
  // On mount, check if we have valid tokens in localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userId = localStorage.getItem('userId');
    if (accessToken && refreshToken && userId) {
      setUser({ userId });
    }
    setLoading(false);
  }, []);
  const persistAuth = useCallback((data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.userId) {
      localStorage.setItem('userId', data.userId);
    }
    setUser({ userId: data.userId || localStorage.getItem('userId') });
    setError(null);
  }, []);
  const signup = useCallback(async (email, password) => {
    try {
      setError(null);
      const data = await authApi.signup(email, password);
      persistAuth(data);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed. Please try again.';
      setError(message);
      throw err;
    }
  }, [persistAuth]);
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const data = await authApi.login(email, password);
      persistAuth(data);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      throw err;
    }
  }, [persistAuth]);
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
  const handleGoogleCallback = useCallback((params) => {
    // The backend Google callback will return tokens somehow —
    // either via query params or response body. We handle query params.
    const { accessToken, refreshToken, userId } = params;
    if (accessToken && refreshToken && userId) {
      persistAuth({ accessToken, refreshToken, userId });
    }
  }, [persistAuth]);
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