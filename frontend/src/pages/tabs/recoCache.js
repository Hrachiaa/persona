import { registerSessionCache } from '../../utils/sessionCaches';
import { TOTAL_TESTS } from '../../utils/constants';

// Module-scoped state of the recommendations swipe decks, shared by the Reads
// tab and the session prefetch (utils/prefetchSession.js).

// Per-mode set of ids the user has already swiped this session. Guards the merge
// on refetch: a card we optimistically removed must not reappear if the server
// still lists it as PENDING (its swipe POST may be mid-flight).
export const swiped = { film: new Set(), book: new Set() };

// Per-mode deck: the last known { status, cards, lockInfo? } per media type, so
// returning to the tab (or flipping film↔book and back) shows the deck instantly
// instead of a "loading" fill. `status: 'error'` is never cached — an error
// screen must not outlive the visit that saw it.
export const decks = {}; // mode -> { status: 'locked' | 'generating' | 'ready', cards: [...], lockInfo? }

// Map a GET /recommendations response onto the next deck for `type`, merging
// fresh cards into whatever stack survives in the cache (minus locally swiped
// ones). Pure with respect to the response — reads decks/swiped, writes nothing.
export function mergeDeckResponse(type, resp) {
  if (resp.status === 'locked') {
    return {
      status: 'locked',
      cards: [],
      lockInfo: { completed: resp.completed ?? 0, required: resp.required ?? TOTAL_TESTS },
    };
  }
  const prev = decks[type]?.cards ?? [];
  if (resp.status === 'generating') {
    return { status: 'generating', cards: prev };
  }
  // ready
  const have = new Set(prev.map((c) => c.id));
  const fresh = (resp.items || []).filter((i) => !swiped[type].has(i.id) && !have.has(i.id));
  return { status: 'ready', cards: [...prev, ...fresh] };
}

// One account's decks and swipe guards never leak into the next session.
registerSessionCache(() => {
  swiped.film.clear();
  swiped.book.clear();
  delete decks.film;
  delete decks.book;
});
