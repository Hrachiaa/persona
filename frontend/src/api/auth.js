import client from './client';

export const authApi = {
  signup: (email, password) =>
    client.post('/auth/signup', { email, password }).then((r) => r.data),

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

  addProfileInfo: ({ name, gender, birthDate }) =>
    client.post('/auth/add-user-profile-info', { name, gender, birthDate }).then((r) => r.data),

  // Returns the full URL for Google OAuth redirect
  getGoogleLoginUrl: () => '/api/auth/google/login',
};