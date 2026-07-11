import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSessionCache } from './sessionCaches';

// Session-scoped stale-while-revalidate cache for backend GET resources.
//
// The dashboard unmounts a tab on every switch, so per-component state starts
// empty and every visit used to refetch behind a spinner. This module is the
// shared version of the pattern testsCache.js established: data lives at module
// scope (it survives unmounts), a revisit renders the cached copy instantly,
// and a background refetch swaps in fresh data when it lands. Loading UI is
// only ever shown when there is nothing cached yet.
//
// Rules of use:
// - Key per resource, string, namespaced by parameter: 'friends', `chat:${id}`.
// - Mutations must keep the cache truthful: either update it in place
//   (writeResource/updateResource/mutate) or force a background refetch
//   (fetchResource(..., { force: true })). Prefer those over invalidateResource
//   for anything that renders a loading state — invalidating brings the
//   spinner back on the next visit, which is exactly what this module exists
//   to avoid.
// - One account's data must never survive into the next session: the whole
//   store resets via sessionCaches (fired by AuthContext on login/logout).

const store = new Map(); // key -> last known good data
const inflight = new Map(); // key -> in-flight fetch promise (dedup)
// Bumped on session reset: a response that started before the bump (another
// account's data after a login switch) must not land in the fresh store.
let epoch = 0;

registerSessionCache(() => {
  store.clear();
  inflight.clear();
  epoch += 1;
});

/** Last cached value for `key`, or undefined when nothing is cached. */
export function peekResource(key) {
  return store.get(key);
}

/** Overwrite `key` with `data` (also seeds keys that were never fetched).
 *  `undefined` means "nothing cached", so writing it drops the key instead. */
export function writeResource(key, data) {
  if (data === undefined) store.delete(key);
  else store.set(key, data);
}

/** Rewrite a cached value in place; a key with no cache entry is left alone. */
export function updateResource(key, updater) {
  if (store.has(key)) store.set(key, updater(store.get(key)));
}

/** Drop keys entirely — the next reader shows its loading state and refetches. */
export function invalidateResource(...keys) {
  for (const key of keys) {
    store.delete(key);
    inflight.delete(key);
  }
}

/**
 * Fetch `key` through the cache. Without `force`, a cached value resolves
 * immediately and no request is made; with `force` the request always fires
 * (stale-while-revalidate — callers keep rendering the old value meanwhile).
 * Concurrent calls for the same key share one request (StrictMode's double
 * mount, poll ticks racing a mount, several components on one resource).
 */
export function fetchResource(key, fetcher, { force = false } = {}) {
  if (!force && store.has(key)) return Promise.resolve(store.get(key));
  const running = inflight.get(key);
  if (running) return running;

  const started = epoch;
  const promise = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      if (epoch === started) writeResource(key, data);
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/**
 * The screen-side of the cache: render the cached value synchronously (no
 * loading state on a revisit) and revalidate in the background on mount / key
 * change. `loading` is true only while nothing is cached yet; a failed
 * revalidation keeps the stale data visible and just flags `error`.
 *
 * Returns { data, loading, error, refresh, mutate }:
 * - refresh() — forced refetch (poll ticks, "retry" buttons); resolves with data.
 * - mutate(next | prev => next) — optimistic local change, written through to
 *   the cache so the next mount agrees with what the user just did.
 */
export function useResource(key, fetcher, { enabled = true } = {}) {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // State is tagged with the key it belongs to. When the key changes, renders
  // derive the new key's cache directly (never the old key's data); the state
  // itself re-aligns when the revalidation below lands.
  const [state, setState] = useState(() => ({ key, data: peekResource(key), error: false }));
  const current = state.key === key ? state : { key, data: peekResource(key), error: false };

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    fetchResource(key, () => fetcherRef.current(), { force: true })
      .then((data) => {
        if (active) setState({ key, data, error: false });
      })
      .catch(() => {
        if (active) setState((s) => ({ key, data: s.key === key ? s.data : peekResource(key), error: true }));
      });
    return () => {
      active = false;
    };
  }, [key, enabled]);

  const refresh = useCallback(() => {
    return fetchResource(key, () => fetcherRef.current(), { force: true }).then(
      (data) => {
        setState({ key, data, error: false });
        return data;
      },
      (err) => {
        setState((s) => ({ key, data: s.key === key ? s.data : peekResource(key), error: true }));
        throw err;
      },
    );
  }, [key]);

  const mutate = useCallback(
    (next) => {
      setState((s) => {
        const base = s.key === key ? s.data : peekResource(key);
        const value = typeof next === 'function' ? next(base) : next;
        writeResource(key, value);
        return { key, data: value, error: false };
      });
    },
    [key],
  );

  return {
    data: current.data,
    loading: enabled && current.data === undefined && !current.error,
    error: current.error,
    refresh,
    mutate,
  };
}
