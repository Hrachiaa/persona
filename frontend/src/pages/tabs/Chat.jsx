import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  HiOutlineBars3,
  HiOutlineTrash,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { chatApi } from '../../api/chat';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';

// ─── Shared bits ────────────────────────────────────────────────────────────────

/** The Persona emblem (matches the brand λ used across the app). */
function Emblem({ className = '' }) {
  return <span className={`font-display text-persona-dark ${className}`}>λ</span>;
}

/** Localized title for a chat from its kind + friend name. */
function useChatTitle() {
  const { t } = useTranslation('chat');
  return (chat) => {
    if (!chat) return '';
    return chat.kind === 'compatibility'
      ? t('compatTitle', { name: chat.friendName || t('friendFallback') })
      : t('portraitTitle');
  };
}

// ─── Chat list (burger) / empty state ───────────────────────────────────────────

function ChatList({ navigate }) {
  const { t } = useTranslation('chat');
  const title = useChatTitle();
  const [chats, setChats] = useState(null);

  useEffect(() => {
    let active = true;
    chatApi
      .list()
      .then((r) => active && setChats(r))
      .catch(() => active && setChats([]));
    return () => { active = false; };
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      aria-label={t('listTitle')}
      className="px-6 pt-2 pb-6 min-h-[calc(100dvh-80px)]"
    >
      <h1 className="font-display text-4xl font-semibold text-persona-dark mb-1">{t('listTitle')}</h1>
      <p className="text-persona-muted mb-8">{t('listSubtitle')}</p>

      {chats === null ? (
        <p className="text-sm text-persona-muted px-1">{t('common:loading')}</p>
      ) : chats.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {chats.map((c) => {
            const Icon = c.kind === 'compatibility' ? HiOutlineUsers : HiOutlineSparkles;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/chat/${c.id}`, { state: { chat: c } })}
                className="w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3.5 text-left card-hover"
              >
                <span className="w-11 h-11 shrink-0 rounded-full bg-persona-accent-peach/40 flex items-center justify-center text-persona-dark">
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-persona-dark text-sm truncate">{title(c)}</p>
                  <p className="text-xs text-persona-muted truncate">
                    {c.lastMessage || t('noMessages')}
                  </p>
                </div>
                <HiOutlineChevronRight className="w-5 h-5 text-persona-muted shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

/** Shown when the user has no chats — chats are started from Portrait / Compatibility. */
function EmptyState() {
  const { t } = useTranslation('chat');
  return (
    <div className="flex flex-col items-center text-center py-16">
      <Emblem className="text-6xl mb-6 text-persona-accent-peach" />
      <h2 className="font-display text-xl font-semibold text-persona-dark mb-2">{t('emptyTitle')}</h2>
      <p className="text-sm text-persona-muted max-w-xs leading-relaxed">{t('emptyBody')}</p>
    </div>
  );
}

// ─── Conversation ───────────────────────────────────────────────────────────────

function MessageBubble({ role, content, pending }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-persona-card rounded-3xl rounded-br-lg px-4 py-2.5 shadow-warm">
          <p className="text-sm text-persona-dark whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <Emblem className="text-xl shrink-0 mt-0.5 text-persona-accent-peach" />
      <div className="min-w-0 flex-1 text-persona-dark">
        {content ? (
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
        ) : pending ? (
          <TypingDots />
        ) : null}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="…">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-persona-muted"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }) {
  const { t } = useTranslation('chat');
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="surface-warm rounded-3xl p-6 w-full max-w-sm text-center"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-persona-accent-pink/40 flex items-center justify-center">
          <HiOutlineExclamationTriangle className="w-6 h-6 text-persona-dark" />
        </div>
        <h2 className="font-display text-lg font-semibold text-persona-dark mb-1.5">{t('deleteTitle')}</h2>
        <p className="text-sm text-persona-muted leading-relaxed mb-6">{t('deleteBody')}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">{t('common:cancel')}</button>
          <button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-full bg-persona-accent-pink text-persona-dark font-medium shadow-warm hover:shadow-warm-lg transition-all"
          >
            {t('deleteConfirm')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Conversation({ chatId, navigate, locationState }) {
  const { t } = useTranslation('chat');
  const title = useChatTitle();
  const [chat, setChat] = useState(locationState?.chat || null);
  const [messages, setMessages] = useState(locationState?.chat?.messages || []);
  const [loading, setLoading] = useState(!locationState?.chat?.messages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    let active = true;
    chatApi
      .get(chatId)
      .then((r) => {
        if (!active) return;
        setChat(r);
        setMessages(r.messages);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [chatId]);

  // Keep the latest message in view as it streams in.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content },
      { id: assistantId, role: 'assistant', content: '', pending: true },
    ]);

    const append = (delta) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta, pending: false } : m)),
      );

    abortRef.current = new AbortController();
    try {
      await chatApi.sendMessage(chatId, content, { onDelta: append, signal: abortRef.current.signal });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content || `_${t('error')}_`, pending: false } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    abortRef.current?.abort();
    try {
      await chatApi.clear(chatId);
    } catch { /* ignore */ }
    setMessages([]);
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg flex flex-col"
    >
      {/* Top bar: burger (all chats) · title · delete history */}
      <header className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3 border-b border-persona-line/50">
        <motion.button
          onClick={() => navigate('/chat')}
          aria-label={t('allChats')}
          className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-warm"
          whileTap={{ scale: 0.9 }}
        >
          <HiOutlineBars3 className="w-5 h-5 text-persona-dark" />
        </motion.button>
        <p className="flex-1 min-w-0 text-center font-medium text-persona-dark truncate">
          {chat ? title(chat) : ''}
        </p>
        <motion.button
          onClick={() => setConfirmDelete(true)}
          aria-label={t('deleteTitle')}
          disabled={messages.length === 0}
          className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-warm text-persona-dark disabled:opacity-40"
          whileTap={{ scale: 0.9 }}
        >
          <HiOutlineTrash className="w-5 h-5" />
        </motion.button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="h-full flex items-center justify-center text-persona-muted text-sm">
            {t('common:loading')}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <Emblem className="text-6xl mb-5 text-persona-accent-peach" />
            <p className="text-sm text-persona-muted max-w-xs leading-relaxed">
              {chat?.kind === 'compatibility'
                ? t('hintCompat', { name: chat?.friendName || t('friendFallback') })
                : t('hintPortrait')}
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} pending={m.pending} />
            ))}
          </div>
        )}
      </div>

      {/* Input row — send button only, on the same level as the field */}
      <div className="shrink-0 px-4 pb-5 pt-2">
        <div className="mx-auto w-full max-w-2xl flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('inputPlaceholder')}
            className="flex-1 resize-none max-h-40 rounded-3xl bg-white shadow-warm px-5 py-3.5 text-sm text-persona-dark placeholder:text-persona-muted focus:outline-none focus:ring-2 focus:ring-persona-accent-peach"
          />
          <motion.button
            onClick={send}
            disabled={!input.trim() || sending}
            aria-label={t('send')}
            className="w-12 h-12 shrink-0 rounded-full bg-persona-dark text-white flex items-center justify-center shadow-warm disabled:opacity-40 transition-opacity"
            whileTap={{ scale: 0.9 }}
          >
            <HiOutlinePaperAirplane className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirm onCancel={() => setConfirmDelete(false)} onConfirm={doDelete} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Router: derive the sub-view from the URL ───────────────────────────────────

export default function Chat({ onImmersiveChange }) {
  const location = useLocation();
  const navigate = useNavigate();

  const onChatRoute = location.pathname === '/chat' || location.pathname.startsWith('/chat/');
  const segments = location.pathname.split('/').filter(Boolean);
  const chatId = segments[1] || null;

  // The conversation goes immersive (no dashboard chrome / bottom nav); the list keeps it.
  const immersive = onChatRoute && !!chatId;
  useEffect(() => { onImmersiveChange?.(immersive); }, [immersive, onImmersiveChange]);
  useEffect(() => () => onImmersiveChange?.(false), [onImmersiveChange]);

  if (!onChatRoute) return null;

  if (chatId) {
    return (
      <Conversation
        key={`chat-${chatId}`}
        chatId={chatId}
        navigate={navigate}
        locationState={location.state}
      />
    );
  }
  return <ChatList key="list" navigate={navigate} />;
}
