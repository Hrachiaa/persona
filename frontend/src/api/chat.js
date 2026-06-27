import client from './client';
import i18n from '../i18n';

// AI chat. Chats can't be created freely — they're opened from the Portrait
// ("portrait" chat, one per user) and Compatibility ("compatibility" chat, one per
// friend) screens. Replies stream over SSE, so `sendMessage` bypasses the axios
// client and reads the response body directly (fetch lets us set the auth header,
// which native EventSource can't).
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const chatApi = {
  // GET /chat -> [{ id, kind, friendId, friendName, lastMessage, updatedAt }]
  list: () => client.get('/chat').then((r) => r.data),

  // POST /chat/portrait -> ChatDetail { id, kind, friendId, friendName, messages }
  openPortrait: () => client.post('/chat/portrait', {}).then((r) => r.data),

  // POST /chat/compatibility/:friendId -> ChatDetail
  openCompatibility: (friendId) =>
    client.post(`/chat/compatibility/${friendId}`, {}).then((r) => r.data),

  // GET /chat/:id -> ChatDetail
  get: (id) => client.get(`/chat/${id}`).then((r) => r.data),

  // DELETE /chat/:id/messages -> { ok } — wipes history irreversibly
  clear: (id) => client.delete(`/chat/${id}/messages`).then((r) => r.data),

  /**
   * Streams a reply over SSE. Calls `onDelta(text)` for each token. Resolves with the
   * full reply once `{done:true}` arrives; rejects on `{error}` or transport failure.
   * Pass an AbortSignal to cancel (e.g. leaving the screen).
   */
  async sendMessage(id, content, { onDelta, signal } = {}) {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_URL}/chat/${id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Chat request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    // Parse the SSE stream: events are separated by a blank line; each carries a
    // single JSON `data:` payload — { delta } | { done } | { error }.
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        const line = rawEvent.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        let payload;
        try {
          payload = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        if (payload.error) throw new Error(payload.error);
        if (payload.done) return full;
        if (typeof payload.delta === 'string') {
          full += payload.delta;
          onDelta?.(payload.delta);
        }
      }
    }
    return full;
  },
};
