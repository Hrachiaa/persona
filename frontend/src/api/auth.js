import client from './client';

export const authApi = {
  // `language` seeds the new account's UI language from the pre-signup choice
  // (browser / survey toggle), so the first-run screens don't flip to the
  // server default the moment /auth/me lands.
  signup: (email, password, language) =>
    client.post('/auth/signup', { email, password, ...(language ? { language } : {}) }).then((r) => r.data),

  login: (email, password) =>
    client.post('/auth/login', { email, password }).then((r) => r.data),

  refreshTokens: (refreshToken) =>
    client.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken) =>
    client.post('/auth/logout', { refreshToken }).then((r) => r.data),

  forgotPassword: (email) =>
    client.post('/auth/forgot-password', { email }).then((r) => r.data),

  forgotPasswordCode: (email, code) =>
    client.post('/auth/forgot-password-code', { email, code }).then((r) => r.data),

  changeForgottenPassword: (email, code, newPassword) =>
    client.post('/auth/change-forgotten-password', { email, code, newPassword }).then((r) => r.data),

  // Change password for the logged-in user (JWT-protected)
  changePassword: (currentPassword, newPassword) =>
    client.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),

  addProfileInfo: ({ name, gender, birthDate, language }) =>
    client.post('/auth/add-user-profile-info', { name, gender, birthDate, language }).then((r) => r.data),

  // Update the logged-in user's UI language (JWT-protected)
  updateLanguage: (language) =>
    client.post('/auth/language', { language }).then((r) => r.data),

  // Fetch current user profile (JWT-protected)
  getMe: () =>
    client.get('/auth/me').then((r) => r.data),

  // Returns the full URL for Google OAuth redirect
  getGoogleLoginUrl: () =>
    `${import.meta.env.VITE_API_URL || '/api'}/auth/google/login`,
};