import client from './client';

export const portraitApi = {
  // returns one of:
  //   { status: 'locked', completed, required }
  //   { status: 'ready', content, basedOn }
  //   { status: 'error' }
  // On the first 'ready' call the portrait is generated server-side (may take up
  // to a minute) and cached; regenerated once all 6 tests are done.
  getPortrait: () => client.get('/portrait').then((r) => r.data),
};
