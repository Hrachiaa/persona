import { portraitApi } from '../../api/portrait';
import { registerSessionCache } from '../../utils/sessionCaches';

// Module-scoped cache of GET /portrait, shared by the Portrait tab and the
// session prefetch (utils/prefetchSession.js). Every non-error response is kept
// (ready, locked, generating) so a revisit renders the tab's real state
// instantly — the revalidation/poll that always follows keeps it honest. An
// `error` must not outlive the visit that saw it.
let cache = null; // last successful response
// One shared in-flight request: StrictMode's double mount, the tab's poll and
// the prefetch all reuse a single backend call (GET can kick off a generation
// server-side, so duplicates are not just wasteful).
let inFlight = null;
// Bumped on session reset: a response from before the bump (another account's
// portrait after a login switch) must not land in the fresh cache.
let epoch = 0;

export function fetchPortrait() {
  if (!inFlight) {
    const started = epoch;
    inFlight = portraitApi
      .getPortrait()
      .then((r) => {
        if (r.status !== 'error' && epoch === started) cache = r;
        return r;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function getCachedPortrait() {
  return cache;
}

// Never carry one account's portrait into the next session.
registerSessionCache(() => {
  cache = null;
  inFlight = null;
  epoch += 1;
});
