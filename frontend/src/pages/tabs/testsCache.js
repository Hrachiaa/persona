import { testsApi } from '../../api/tests';
import { registerSessionCache } from '../../utils/sessionCaches';

// Module-scoped cache of GET /tests (the test list with per-user result + part
// progress). Kept here, outside any component, so the Portrait can render an orb
// card / progress ring instantly on revisit, and the runner can bust it after
// a submit so the next read reflects the new state.
let cache = null;
let inFlight = null;
// Bumped on every invalidation: an in-flight response from before the bump
// (another account's data after a login switch, or a pre-submit snapshot) must
// not land in the fresh cache.
let epoch = 0;

export function fetchTestsCached() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    const started = epoch;
    inFlight = testsApi.getAllTests()
      .then((d) => {
        if (epoch === started) cache = d;
        return d;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

export function getCachedTests() { return cache; }

export function invalidateTestsCache() {
  cache = null;
  inFlight = null;
  epoch += 1;
}

// Never carry one account's test list into the next session.
registerSessionCache(invalidateTestsCache);
