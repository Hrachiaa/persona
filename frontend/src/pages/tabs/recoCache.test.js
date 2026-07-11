import { describe, it, expect, beforeEach } from 'vitest';
import { decks, swiped, mergeDeckResponse } from './recoCache';
import { resetSessionCaches } from '../../utils/sessionCaches';
import { TOTAL_TESTS } from '../../utils/constants';

// decks/swiped are module-global — start every test from a clean session.
beforeEach(() => {
  resetSessionCaches();
});

describe('mergeDeckResponse', () => {
  it('maps a locked response to an empty deck with lock info', () => {
    const next = mergeDeckResponse('book', { status: 'locked', completed: 2, required: 6 });
    expect(next).toEqual({ status: 'locked', cards: [], lockInfo: { completed: 2, required: 6 } });
  });

  it('defaults lock info when the response omits the counts', () => {
    const next = mergeDeckResponse('book', { status: 'locked' });
    expect(next.lockInfo).toEqual({ completed: 0, required: TOTAL_TESTS });
  });

  it('keeps the surviving stack while generating', () => {
    decks.book = { status: 'ready', cards: [{ id: 'a' }] };
    const next = mergeDeckResponse('book', { status: 'generating', items: [] });
    expect(next).toEqual({ status: 'generating', cards: [{ id: 'a' }] });
  });

  it('merges fresh cards without duplicating ones already in the stack', () => {
    decks.book = { status: 'ready', cards: [{ id: 'a' }] };
    const next = mergeDeckResponse('book', {
      status: 'ready',
      items: [{ id: 'a' }, { id: 'b' }],
    });
    expect(next.cards.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('never resurrects a locally swiped card', () => {
    swiped.book.add('gone');
    const next = mergeDeckResponse('book', {
      status: 'ready',
      items: [{ id: 'gone' }, { id: 'kept' }],
    });
    expect(next.cards.map((c) => c.id)).toEqual(['kept']);
  });

  it('modes are independent', () => {
    decks.film = { status: 'ready', cards: [{ id: 'f' }] };
    const next = mergeDeckResponse('book', { status: 'ready', items: [{ id: 'b' }] });
    expect(next.cards.map((c) => c.id)).toEqual(['b']);
  });
});

describe('session reset', () => {
  it('clears decks and swipe guards', () => {
    decks.book = { status: 'ready', cards: [{ id: 'a' }] };
    swiped.film.add('x');
    resetSessionCaches();
    expect(decks.book).toBeUndefined();
    expect(swiped.film.size).toBe(0);
  });
});
