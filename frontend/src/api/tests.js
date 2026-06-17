import client from './client';

export const testsApi = {
  getAllTests: () =>
    client.get('/tests').then((r) => r.data),

  getTestQuestions: (testId) =>
    client.get(`/tests/${testId}`).then((r) => r.data),

  submitTest: (testId, answers) =>
    client.post(`/tests/${testId}/submit`, { answers }).then((r) => r.data),

  // Mint (or reuse) a public share token for this test's result → { token }.
  shareTest: (testId) =>
    client.post(`/tests/${testId}/share`).then((r) => r.data),

  // Public — fetch a shared result by token (no auth required).
  // → { testType, testName, ownerName, result }
  getSharedResult: (token) =>
    client.get(`/tests/shared/${token}`).then((r) => r.data),
};
