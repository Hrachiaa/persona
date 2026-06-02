import client from './client';

export const testsApi = {
  getAllTests: () =>
    client.get('/tests').then((r) => r.data),

  getTestQuestions: (testId) =>
    client.get(`/tests/${testId}`).then((r) => r.data),

  submitTest: (testId, answers) =>
    client.post(`/tests/${testId}/submit`, { answers }).then((r) => r.data),

  // returns { testId, testType, result, interpretation }; interpretation is
  // generated lazily on first call (may take a few seconds) and cached after.
  getResult: (testId) =>
    client.get(`/tests/${testId}/result`).then((r) => r.data),
};
