// The resourceCache keys shared across features. One module owns the literals
// so a screen and the session prefetch (prefetchSession.js) can never drift
// onto different keys for the same backend resource.

export const CHATS_KEY = 'chats'; // GET /chat
export const chatKey = (id) => `chat:${id}`; // GET /chat/:id

export const FRIENDS_KEY = 'friends'; // GET /friends
export const FRIEND_REQUESTS_KEY = 'friend-requests'; // GET /friends/requests
export const FRIEND_INVITE_KEY = 'friend-invite-token'; // GET /friends/invite
export const friendResultsKey = (friendId) => `friend-results:${friendId}`; // GET /friends/:id/results
export const friendCompatKey = (friendId) => `friend-compat:${friendId}`; // GET /friends/:id/compatibility

export const RECO_HISTORY_KEY = 'reco-history'; // GET /recommendations/history
export const SUBSCRIPTION_KEY = 'subscription'; // GET /subscriptions/me
