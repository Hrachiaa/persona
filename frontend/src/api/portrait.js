import client from './client';

export const portraitApi = {
  // returns one of:
  //   { status: 'locked', completed, required }
  //   { status: 'generating', completedTests }                  // first-ever build; tests done so far
  //   { status: 'ready', content, basedOn, completedTests, updatedAt, refreshing }
  //   { status: 'error' }
  // The portrait is generated server-side when a test is submitted (and regenerated
  // on every retake). This read is non-blocking. A cached portrait is always returned
  // as 'ready' if one exists — even while a newer generation is in flight, in which
  // case `refreshing` is true and the caller should poll and swap in the fresh version
  // (keyed by `updatedAt`) once it lands. `completedTests` lists every test the user
  // has finished (a superset of `basedOn` while a newer test isn't reflected yet), so
  // the constellation can show a loading ring on tests not yet in the portrait.
  // 'generating' is only returned when there is no cached portrait at all.
  getPortrait: () => client.get('/portrait').then((r) => r.data),
};
