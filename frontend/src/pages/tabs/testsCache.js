import { testsApi } from '../../api/tests';

// Module-scoped cache of GET /tests (the test list with per-user result + part
// progress). Kept here, outside any component, so the Portrait can render an orb
// card / progress ring instantly on revisit, and the runner can bust it after
// committing a fragment so the next read reflects the new `partsCompleted`.
let cache = null;
let inFlight = null;

export function fetchTestsCached() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = testsApi.getAllTests()
      .then((d) => { cache = d; return d; })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

export function getCachedTests() { return cache; }

export function invalidateTestsCache() { cache = null; }
