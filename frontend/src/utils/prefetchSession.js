import { fetchResource } from './resourceCache';
import {
  CHATS_KEY,
  FRIENDS_KEY,
  FRIEND_REQUESTS_KEY,
  FRIEND_INVITE_KEY,
  RECO_HISTORY_KEY,
  SUBSCRIPTION_KEY,
} from './resourceKeys';
import { registerSessionCache } from './sessionCaches';
import { chatApi } from '../api/chat';
import { friendsApi } from '../api/friends';
import { recommendationsApi } from '../api/recommendations';
import { subscriptionsApi } from '../api/subscriptions';
import { fetchTestsCached } from '../pages/tabs/testsCache';
import { fetchPortrait } from '../pages/tabs/portraitCache';
import { decks, mergeDeckResponse } from '../pages/tabs/recoCache';

// Warm every screen's data the moment a session starts (sign-in, sign-up,
// Google callback, or a restored session on page load), so even the FIRST
// visit to each tab renders instantly instead of behind a spinner. Fired by
// AuthContext once the user lands; everything is best-effort — a failed
// warm-up just leaves that screen to load on visit, exactly like before.
//
// Deliberately only tab-level data: per-friend results/compatibility and
// individual conversations load on entry (prefetching those would fan out
// into N requests for screens the user may never open).
//
// NOTE: this module is imported eagerly (from AuthContext), so it must only
// pull in api modules and the small cache modules — never the lazy tab
// components themselves, or they'd land in the initial bundle.

// One warm-up per account: StrictMode's double effect and repeated /auth/me
// refreshes must not fire a second volley. Cleared with the session so the
// next sign-in prefetches its own data.
let warmedFor = null;
registerSessionCache(() => {
  warmedFor = null;
});

export function prefetchSessionData(userId) {
  if (!userId || warmedFor === userId) return;
  warmedFor = userId;

  const quiet = (promise) => promise.catch(() => {});

  quiet(fetchTestsCached()); // portrait constellation + chat/reads gates + runner
  quiet(fetchPortrait()); // caches a `ready` portrait inside portraitCache
  quiet(fetchResource(CHATS_KEY, chatApi.list));
  quiet(fetchResource(FRIENDS_KEY, friendsApi.list));
  quiet(fetchResource(FRIEND_REQUESTS_KEY, friendsApi.requests));
  quiet(fetchResource(FRIEND_INVITE_KEY, friendsApi.getInviteToken));
  quiet(fetchResource(RECO_HISTORY_KEY, recommendationsApi.history));
  quiet(fetchResource(SUBSCRIPTION_KEY, subscriptionsApi.me));

  // Both swipe decks (the reads tab defaults to books, films are one tap away).
  // Skip a deck the tab already owns — its own merge/poll cycle is in charge.
  // The warmedFor re-check drops a response that started before a session reset
  // (mirrors the epoch guards inside the cache modules).
  for (const type of ['book', 'film']) {
    if (decks[type]) continue;
    quiet(
      recommendationsApi.get(type).then((resp) => {
        if (warmedFor === userId && !decks[type]) decks[type] = mergeDeckResponse(type, resp);
      }),
    );
  }
}
