import client from './client';

// Tinder-style book/film recommendations. The backend generates batches from the
// user's test results (then from their like/dislike history), enriches each pick
// with a real poster + synopsis, and serves the not-yet-swiped queue.
export const recommendationsApi = {
  // GET /recommendations?type=film|book -> one of:
  //   { status: 'locked', mediaType, completed, required }     // not all tests done
  //   { status: 'generating', mediaType, items: [], generating: true }
  //   { status: 'ready', mediaType, items: [...], generating } // generating = more coming
  get: (type) => client.get('/recommendations', { params: { type } }).then((r) => r.data),

  // POST /recommendations/:id/swipe { verdict } -> { pending }
  swipe: (id, verdict) =>
    client.post(`/recommendations/${id}/swipe`, { verdict }).then((r) => r.data),

  // POST /recommendations/reset?type=film|book -> { ok: true }
  // Body must be a real object — sending `null` with the client's default
  // application/json content type serializes to "null", which the body parser rejects.
  reset: (type) => client.post('/recommendations/reset', {}, { params: { type } }).then((r) => r.data),
};
