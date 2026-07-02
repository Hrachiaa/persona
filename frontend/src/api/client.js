import axios from 'axios';
import i18n from '../i18n';

// In dev, Vite proxy rewrites /api → backend. In prod, we hit the backend directly.
const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token + current UI language to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Lets the backend localize error messages, emails and AI-generated content.
  config.headers['Accept-Language'] = i18n.language;
  return config;
});

// ── 401 → token refresh ──────────────────────────────────────────────────────
// One refresh at a time: every caller of refreshAccessToken() while a refresh is
// in flight (concurrent 401s from the interceptor below, or the SSE chat's raw
// fetch) awaits the same attempt. On failure the session is dead — clear it and
// bounce to `/` for a re-login.
let refreshPromise = null;

function clearSessionAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  window.location.href = '/';
}

async function performRefresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  // Bare axios, not `client` — the interceptor must not recurse into itself.
  const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data.accessToken;
}

/**
 * Refresh the token pair (deduped across concurrent callers); resolves with the
 * new access token. Exported for requests that bypass the axios client — e.g.
 * the SSE chat fetch — so they can replicate the retry-once-after-refresh flow.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .catch((error) => {
        clearSessionAndRedirect();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Failure clears the session and redirects; rethrows to the caller.
      const token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return client(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default client;