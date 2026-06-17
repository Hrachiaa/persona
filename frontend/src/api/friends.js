import client from './client';

// Friends + AI compatibility. The backend gates compatibility on both users having
// completed every test and caches the result (regenerated on either's retake).
export const friendsApi = {
  // GET /friends -> [{ id, name, email, relation: 'friends', friendshipId }]
  list: () => client.get('/friends').then((r) => r.data),

  // GET /friends/requests -> { incoming: [...], outgoing: [...] }  (FriendDto[])
  requests: () => client.get('/friends/requests').then((r) => r.data),

  // GET /friends/search?email= -> FriendDto | null  (relation tells the UI what to show)
  search: (email) =>
    client.get('/friends/search', { params: { email } }).then((r) => r.data),

  // POST /friends/request { targetId } -> { status }
  sendRequest: (targetId) =>
    client.post('/friends/request', { targetId }).then((r) => r.data),

  // POST /friends/:friendshipId/accept -> { ok }
  accept: (friendshipId) =>
    client.post(`/friends/${friendshipId}/accept`, {}).then((r) => r.data),

  // POST /friends/:friendshipId/decline -> { ok }  (also cancels an outgoing request)
  decline: (friendshipId) =>
    client.post(`/friends/${friendshipId}/decline`, {}).then((r) => r.data),

  // DELETE /friends/:friendId -> { ok }
  remove: (friendId) => client.delete(`/friends/${friendId}`).then((r) => r.data),

  // GET /friends/invite -> { token }  (stable personal invite link)
  getInviteToken: () => client.get('/friends/invite').then((r) => r.data),

  // POST /friends/invite/accept { token } -> { status }
  acceptInvite: (token) =>
    client.post('/friends/invite/accept', { token }).then((r) => r.data),

  // GET /friends/:friendId/results -> [{ testType, testName, result }]
  getResults: (friendId) =>
    client.get(`/friends/${friendId}/results`).then((r) => r.data),

  // GET /friends/:friendId/compatibility -> one of:
  //   { status: 'locked', meDone, friendDone, required }
  //   { status: 'generating' }
  //   { status: 'ready', content, score, updatedAt }
  getCompatibility: (friendId) =>
    client.get(`/friends/${friendId}/compatibility`).then((r) => r.data),
};
