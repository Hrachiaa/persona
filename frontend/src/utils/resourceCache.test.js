import { describe, it, expect, beforeEach } from 'vitest';
import {
  peekResource,
  writeResource,
  updateResource,
  invalidateResource,
  fetchResource,
} from './resourceCache';
import { resetSessionCaches } from './sessionCaches';

// The store is module-global — start every test from a clean session.
beforeEach(() => {
  resetSessionCaches();
});

describe('fetchResource', () => {
  it('fetches once, then serves the cache without calling the fetcher', async () => {
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      return Promise.resolve({ n: calls });
    };

    await expect(fetchResource('k', fetcher)).resolves.toEqual({ n: 1 });
    await expect(fetchResource('k', fetcher)).resolves.toEqual({ n: 1 });
    expect(calls).toBe(1);
    expect(peekResource('k')).toEqual({ n: 1 });
  });

  it('dedupes concurrent requests into one fetch (StrictMode double mount)', async () => {
    let calls = 0;
    let release;
    const fetcher = () => {
      calls += 1;
      return new Promise((resolve) => {
        release = () => resolve('data');
      });
    };

    const a = fetchResource('k', fetcher, { force: true });
    const b = fetchResource('k', fetcher, { force: true });
    await Promise.resolve(); // the fetcher itself starts on the next microtask
    release();
    await expect(a).resolves.toBe('data');
    await expect(b).resolves.toBe('data');
    expect(calls).toBe(1);
  });

  it('force refetches past a cached value and updates the cache', async () => {
    writeResource('k', 'stale');
    await expect(fetchResource('k', () => Promise.resolve('fresh'), { force: true })).resolves.toBe('fresh');
    expect(peekResource('k')).toBe('fresh');
  });

  it('does not cache failures, so the next call retries', async () => {
    let calls = 0;
    const failing = () => {
      calls += 1;
      return Promise.reject(new Error('boom'));
    };
    await expect(fetchResource('k', failing)).rejects.toThrow('boom');
    expect(peekResource('k')).toBeUndefined();
    await expect(fetchResource('k', () => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(calls).toBe(1);
  });

  it('drops a response that started before a session reset (account switch)', async () => {
    let release;
    const slow = () =>
      new Promise((resolve) => {
        release = () => resolve('old-account-data');
      });

    const pending = fetchResource('k', slow);
    await Promise.resolve(); // the fetcher itself starts on the next microtask
    resetSessionCaches(); // user logged out / another account logged in
    release();
    await pending;
    expect(peekResource('k')).toBeUndefined();
  });
});

describe('write / update / invalidate', () => {
  it('updateResource rewrites only keys that exist', () => {
    updateResource('missing', () => 'x');
    expect(peekResource('missing')).toBeUndefined();

    writeResource('k', [1, 2]);
    updateResource('k', (v) => [...v, 3]);
    expect(peekResource('k')).toEqual([1, 2, 3]);
  });

  it('writing undefined means "nothing cached"', () => {
    writeResource('k', 'v');
    writeResource('k', undefined);
    expect(peekResource('k')).toBeUndefined();
  });

  it('invalidateResource drops keys so the next fetch goes to the network', async () => {
    writeResource('a', 1);
    writeResource('b', 2);
    invalidateResource('a', 'b');
    expect(peekResource('a')).toBeUndefined();
    await expect(fetchResource('a', () => Promise.resolve('refetched'))).resolves.toBe('refetched');
  });

  it('resetSessionCaches clears everything', () => {
    writeResource('a', 1);
    resetSessionCaches();
    expect(peekResource('a')).toBeUndefined();
  });
});
