import { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  HiOutlineArrowLeft,
  HiOutlineTrash,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { chatApi } from '../../api/chat';
import { friendsApi } from '../../api/friends';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';
import ProgressiveBlur from '../../components/ProgressiveBlur';
import { fetchTestsCached } from './testsCache';

// Chats are gated behind finishing every test (mirrors the Reads tab). Same total
// as the Portrait / Recommendations gate, with the same IQ-invalid handling: an
// "invalid" IQ result doesn't count as a completed test.
const TOTAL_TESTS = 6;
const isTestCompleted = (test) =>
  !!test.result && !(test.testType === 'iq' && test.result?.reliability === 'invalid');

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

// ─── Locked: tests not all done (mirrors the Reads tab's locked screen) ──────────

function LockedScreen({ completed, required, onOpenTests }) {
  const { t } = useTranslation('chat');
  const pct = Math.round((completed / required) * 100);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg flex items-center justify-center px-6 pt-20 pb-24 lg:py-6"
    >
      <div className="surface-warm rounded-4xl p-8 text-center max-w-md w-full">
        <div className="w-14 h-14 mx-auto mb-4 bg-persona-accent-lime/60 rounded-3xl flex items-center justify-center">
          <HiOutlineSparkles className="w-7 h-7 text-persona-dark" />
        </div>
        <h2 className="font-display text-xl font-semibold text-persona-dark mb-1.5">{t('locked.title')}</h2>
        <p className="text-sm text-persona-muted leading-relaxed mb-5">{t('locked.body')}</p>
        <div className="relative h-2.5 bg-persona-line/60 rounded-full overflow-hidden mb-2">
          <motion.div
            className="absolute inset-y-0 left-0 bg-persona-accent-lime rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-persona-muted mb-6 tabular">{t('locked.progress', { completed, required })}</p>
        {onOpenTests && (
          <motion.button onClick={onOpenTests} className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
            {completed === 0 ? t('locked.firstTest') : t('locked.continueTests')}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chat list (burger) / empty state ───────────────────────────────────────────

function ChatList({ navigate, onOpenTests }) {
  const { t } = useTranslation('chat');
  const title = useChatTitle();
  const [chats, setChats] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState('');
  // null = still checking; { completed, required } = locked; false = unlocked.
  const [lock, setLock] = useState(null);

  useEffect(() => {
    let active = true;
    fetchTestsCached()
      .then((tests) => {
        if (!active) return;
        const completed = (tests || []).filter(isTestCompleted).length;
        setLock(completed >= TOTAL_TESTS ? false : { completed, required: TOTAL_TESTS });
      })
      .catch(() => active && setLock(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    chatApi
      .list()
      .then((r) => active && setChats(r))
      .catch(() => active && setChats([]));
    return () => { active = false; };
  }, []);

  if (lock === null) return null; // brief: avoid flashing the list before the gate resolves
  if (lock) return <LockedScreen completed={lock.completed} required={lock.required} onOpenTests={onOpenTests} />;

  const startPortrait = async () => {
    setShowNew(false);
    try {
      const chat = await chatApi.openPortrait();
      navigate(`/chat/${chat.id}`, { state: { chat } });
    } catch { /* ignore */ }
  };

  const startCompat = async (friendId) => {
    try {
      const chat = await chatApi.openCompatibility(friendId);
      navigate(`/chat/${chat.id}`, { state: { chat } });
    } catch { /* ignore */ }
  };

  // Filter by chat title + last message (case-insensitive). The search row is only
  // worth showing once there's something to search.
  const q = query.trim().toLowerCase();
  const filtered = chats?.filter(
    (c) => !q || title(c).toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q),
  );

  return (
    // Fixed full-screen (no page scroll); the dashboard's top bar + bottom nav float
    // over it. The input row is pinned just above the nav and never scrolls.
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-label={t('listTitle')}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg flex flex-col"
    >
      <div className="flex-1 min-h-0 flex flex-col px-6 pt-24 lg:pt-12 overflow-hidden">
        {chats === null ? (
          <p className="text-sm text-persona-muted px-1">{t('common:loading')}</p>
        ) : chats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Emblem className="text-6xl mb-6 text-persona-dark/70" />
            <h2 className="font-display text-xl font-semibold text-persona-dark mb-2">{t('emptyTitle')}</h2>
            <p className="text-sm text-persona-muted max-w-xs leading-relaxed">{t('emptyBody')}</p>
          </div>
        ) : (
          <>
            {/* Title + search — pinned above the scrolling list */}
            <h1 className="font-display text-3xl font-semibold text-persona-dark mb-4 shrink-0">{t('listTitle')}</h1>
            <div className="relative mb-4 shrink-0">
              <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-persona-muted pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                className="w-full rounded-full bg-persona-card border border-persona-line/60 pl-11 pr-4 py-3 text-[15px] text-persona-dark placeholder:text-persona-muted focus:outline-none focus:ring-2 focus:ring-persona-dark/30"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-persona-muted px-1 pt-2">{t('searchEmpty')}</p>
            ) : (
              <div className="space-y-2 overflow-y-auto">
                {filtered.map((c) => {
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
          </>
        )}
      </div>

      {/* New-chat button — pinned above the bottom nav, doesn't scroll */}
      <div className="shrink-0 flex justify-end px-6 pt-2 pb-[6.5rem] lg:pb-9">
        <motion.button
          onClick={() => setShowNew(true)}
          aria-label={t('startTitle')}
          className="w-14 h-14 shrink-0 rounded-full bg-persona-dark text-white flex items-center justify-center shadow-warm-lg"
          whileTap={{ scale: 0.9 }}
        >
          <HiOutlinePlus className="w-6 h-6" />
        </motion.button>
      </div>

      <AnimatePresence>
        {showNew && (
          <NewChatSheet
            onClose={() => setShowNew(false)}
            onPortrait={startPortrait}
            onFriend={startCompat}
            onGoToFriends={() => navigate('/match/add')}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/** Chooser for starting a chat — the only two kinds (portrait / friend compatibility).
 *  Step 1 picks the kind; "With a friend" drills into a friend list (step 2) that opens
 *  the compatibility chat directly. Rendered through a body portal so it sits above the
 *  dashboard's bottom nav (higher stacking context) — the nav tucks underneath. */
function NewChatSheet({ onClose, onPortrait, onFriend, onGoToFriends }) {
  const { t } = useTranslation('chat');
  const [step, setStep] = useState('root'); // 'root' | 'friends'
  const [friends, setFriends] = useState(null);

  const openFriends = () => {
    setStep('friends');
    if (friends === null) {
      friendsApi.list().then(setFriends).catch(() => setFriends([]));
    }
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full sm:max-w-sm bg-persona-bg rounded-t-4xl sm:rounded-4xl p-6 pb-8 max-h-[80dvh] flex flex-col"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'root' ? (
          <>
            <h2 className="font-display text-lg font-semibold text-persona-dark mb-4">{t('startTitle')}</h2>
            <div className="space-y-2">
              <button
                onClick={onPortrait}
                className="w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3.5 text-left card-hover"
              >
                <span className="w-11 h-11 shrink-0 rounded-full bg-persona-accent-peach/40 flex items-center justify-center text-persona-dark">
                  <HiOutlineSparkles className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-persona-dark text-sm">{t('startPortrait')}</p>
                  <p className="text-xs text-persona-muted">{t('startPortraitDesc')}</p>
                </div>
              </button>
              <button
                onClick={openFriends}
                className="w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3.5 text-left card-hover"
              >
                <span className="w-11 h-11 shrink-0 rounded-full bg-persona-accent-lavender/50 flex items-center justify-center text-persona-dark">
                  <HiOutlineUsers className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-persona-dark text-sm">{t('startCompat')}</p>
                  <p className="text-xs text-persona-muted">{t('startCompatDesc')}</p>
                </div>
                <HiOutlineChevronRight className="w-5 h-5 text-persona-muted shrink-0 ml-auto" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setStep('root')}
                aria-label={t('common:back')}
                className="w-9 h-9 shrink-0 rounded-full bg-persona-card flex items-center justify-center"
              >
                <HiOutlineChevronLeft className="w-5 h-5 text-persona-dark" />
              </button>
              <h2 className="font-display text-lg font-semibold text-persona-dark">{t('pickFriend')}</h2>
            </div>

            {friends === null ? (
              <p className="text-sm text-persona-muted px-1 py-4">{t('common:loading')}</p>
            ) : friends.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-persona-muted mb-4">{t('noFriends')}</p>
                <button onClick={onGoToFriends} className="btn-secondary">{t('addFriends')}</button>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onFriend(f.id)}
                    className="w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3 text-left card-hover"
                  >
                    <span className="w-10 h-10 shrink-0 rounded-full bg-persona-accent-peach/50 flex items-center justify-center font-display font-semibold text-persona-dark">
                      {(f.name?.trim() || f.email || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-persona-dark text-sm truncate">{f.name || f.email}</p>
                      {f.name && <p className="text-xs text-persona-muted truncate">{f.email}</p>}
                    </div>
                    <HiOutlineChevronRight className="w-5 h-5 text-persona-muted shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ─── Conversation ───────────────────────────────────────────────────────────────

// Memoized so typing in the input (which re-renders Conversation on every keystroke)
// doesn't re-parse the whole markdown history — only changed messages re-render.
const MessageBubble = memo(function MessageBubble({ role, content, pending }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-persona-card rounded-3xl rounded-br-lg px-4 py-2.5 shadow-warm">
          <p className="font-reading text-[17px] text-persona-dark whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    );
  }
  // Assistant message — full width, no leading emblem. Serif (font-display) at a slightly
  // larger size for the on-screen reading look; overrides the shared markdown text-sm.
  return (
    <div className="font-reading text-persona-dark [&_p]:text-[17px] [&_li]:text-[17px] [&_p]:leading-relaxed [&_li]:leading-relaxed">
      {content ? (
        <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
      ) : pending ? (
        <TypingDots />
      ) : null}
    </div>
  );
});

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

function Conversation({ chatId, onBack, locationState }) {
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
  const taRef = useRef(null);
  // The just-sent question is the scroll anchor: while a reply streams we follow the
  // newest text down, but never past the point where the answer's start sits at the top.
  const anchorIdRef = useRef(null);
  const anchorElRef = useRef(null);
  // Auto-follow is on while a reply streams, but the moment the user scrolls by hand we
  // stop following so we never yank them back. Re-armed on next send.
  const autoFollowRef = useRef(true);
  // The scrollTop value WE last set. Streaming appends below the viewport never move
  // scrollTop, so if it differs from this at the next tick, the USER scrolled — detected
  // synchronously (any input: wheel, touch, scrollbar, keys), no event-timing races.
  const expectedTopRef = useRef(0);

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

  // Auto-grow the input up to ~6 lines, then it scrolls internally.
  const MAX_INPUT_H = 148; // 6 lines of text-sm + vertical padding
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_H)}px`;
  }, [input]);

  // Follow the stream downward, but only until the start of the reply reaches the top —
  // then stop, so a long answer can be read from the beginning. Never scrolls up, and
  // never fights a user who scrolls further down themselves.
  useEffect(() => {
    if (!autoFollowRef.current) return;
    const c = scrollRef.current;
    if (!c) return;
    // The user scrolled away from where we left them → hand control over, stop following.
    if (Math.abs(c.scrollTop - expectedTopRef.current) > 4) {
      autoFollowRef.current = false;
      return;
    }
    const bottom = c.scrollHeight - c.clientHeight;
    let desired = bottom;
    const a = anchorElRef.current;
    if (a) {
      const offset = a.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
      // leave room for the floating top bar so the question lands just below it, not under it
      desired = Math.min(bottom, Math.max(0, offset - 84));
    }
    if (desired > c.scrollTop) c.scrollTop = desired;
    expectedTopRef.current = c.scrollTop;
  }, [messages]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);

    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;
    anchorIdRef.current = userId; // anchor scroll to this question
    autoFollowRef.current = true; // re-arm follow for this reply (until the user scrolls)
    expectedTopRef.current = scrollRef.current ? scrollRef.current.scrollTop : 0; // baseline
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content },
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

  // The disclaimer shows only once a reply has finished generating — not while the AI
  // is still typing and not while waiting on the user.
  const lastMsg = messages[messages.length - 1];
  const showDisclaimer = !sending && lastMsg?.role === 'assistant' && !lastMsg.pending && !!lastMsg.content;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg flex flex-col"
    >
      {/* Top bar — floats over the messages. Text fades into the background as it scrolls
          up (a bg→transparent gradient) and blurs (progressive blur) — the Claude look. */}
      <header className="absolute top-0 inset-x-0 z-40 pointer-events-none">
        <ProgressiveBlur direction="down" className="absolute top-0 inset-x-0 h-24" />
        <div className="relative flex items-center gap-3 px-4 pt-4 pb-3 pointer-events-auto">
          <motion.button
            onClick={onBack}
            aria-label={t('common:back')}
            className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-warm"
            whileTap={{ scale: 0.9 }}
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-persona-dark" />
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
        </div>
      </header>

      {/* Messages — scroll underneath the floating top bar (hence the top padding). The
          content is masked at the top so text fades to transparent as it scrolls up,
          like Claude's mobile header (the buttons live outside this mask). */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0, transparent 56px, #000 104px)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, transparent 56px, #000 104px)',
        }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-persona-muted text-sm">
            {t('common:loading')}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <Emblem className="text-6xl mb-5 text-persona-dark/70" />
            <p className="text-sm text-persona-muted max-w-xs leading-relaxed">
              {chat?.kind === 'compatibility'
                ? t('hintCompat', { name: chat?.friendName || t('friendFallback') })
                : t('hintPortrait')}
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl px-7 pt-20 pb-36 space-y-5">
            {messages.map((m) => (
              <div
                key={m.id}
                ref={(el) => { if (el && m.id === anchorIdRef.current) anchorElRef.current = el; }}
              >
                <MessageBubble role={m.role} content={m.content} pending={m.pending} />
              </div>
            ))}

            {/* Footer disclaimer — only after a reply is done. Emblem left, text right
                (Anthropic-style). */}
            {showDisclaimer && (
              <div className="flex items-center gap-3 pt-1">
                <Emblem className="text-xl shrink-0 text-persona-dark/50" />
                <p className="flex-1 text-right text-xs text-persona-muted leading-snug">{t('disclaimer')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — floats over the messages with no backdrop (fully transparent around it);
          the field and send button are a free-floating pill. */}
      <div className="absolute bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="relative mx-auto w-full max-w-2xl flex items-end gap-2 px-4 pb-5 pt-2 pointer-events-auto">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('inputPlaceholder')}
            className="flex-1 resize-none overflow-y-auto rounded-3xl bg-white shadow-warm-lg px-5 py-3.5 text-[15px] leading-5 text-persona-dark placeholder:text-persona-muted focus:outline-none focus:ring-2 focus:ring-persona-dark/30"
          />
          <motion.button
            onClick={send}
            disabled={!input.trim() || sending}
            aria-label={t('send')}
            className="w-12 h-12 shrink-0 rounded-full bg-persona-dark text-white flex items-center justify-center shadow-warm-lg disabled:opacity-40 transition-opacity"
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

export default function Chat({ onImmersiveChange, onOpenTests }) {
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
    // Back goes to wherever they came from (chat list / portrait / compatibility); falls
    // back to the chat list on a cold deep-link with no history to pop.
    const onBack = () => (location.key === 'default' ? navigate('/chat') : navigate(-1));
    return (
      <Conversation
        key={`chat-${chatId}`}
        chatId={chatId}
        onBack={onBack}
        locationState={location.state}
      />
    );
  }
  return <ChatList key="list" navigate={navigate} onOpenTests={onOpenTests} />;
}
