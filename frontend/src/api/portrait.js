import client from './client';

export const portraitApi = {
  // returns one of:
  //   { status: 'locked', completed, required }
  //   { status: 'generating' }
  //   { status: 'ready', content, basedOn }
  //   { status: 'error' }
  // The portrait is generated server-side when a test is submitted (and regenerated
  // on every retake). This read is non-blocking: while generation is in flight it
  // returns 'generating' and the caller should poll until 'ready'.
  getPortrait: () => client.get('/portrait').then((r) => r.data),
};
