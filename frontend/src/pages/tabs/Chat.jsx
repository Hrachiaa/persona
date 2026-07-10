import { useState, useEffect, useRef, useCallback, useSyncExternalStore, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  HiOutlineArrowLeft,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineMagnifyingGlass,
  HiArrowUp,
  HiOutlineArrowDown,
  HiOutlineSquare2Stack,
  HiOutlineCheck,
  HiOutlineChatBubbleLeftRight,
  HiOutlineLightBulb,
} from 'react-icons/hi2';
import { chatApi } from '../../api/chat';
import { friendsApi } from '../../api/friends';
import { useAuth } from '../../context/AuthContext';
import posthog from 'posthog-js';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';
import ProgressiveBlur from '../../components/ProgressiveBlur';
import LockedCard from '../../components/LockedCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import PaywallModal from '../../components/PaywallModal';
import { showToast } from '../../components/Toast';
import { TOTAL_TESTS, isTestCompleted } from '../../utils/constants';
import { SIGILS } from '../../components/testSigils';
import { partialTestCredit } from './testParts';
import { fetchTestsCached } from './testsCache';

// ─── Shared bits ────────────────────────────────────────────────────────────────

/** Reactive media query (used for the lg two-pane layout and coarse pointers). */
function useMedia(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

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

/** "14:32" today, "вчера"/"2 дня назад" this week, "12 июн." beyond — all via Intl. */
function relativeTime(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (dayDiff <= 0) return new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(d);
  if (dayDiff < 7) return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-dayDiff, 'day');
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(d);
}

/** List avatar: friend's initial for compatibility chats, the sparkle for the portrait. */
function ChatAvatar({ chat }) {
  if (chat.kind === 'compatibility') {
    const initial = (chat.friendName || '?').trim().charAt(0).toUpperCase();
    return (
      <span className="w-11 h-11 shrink-0 rounded-full bg-persona-accent-lavender/40 flex items-center justify-center font-display font-semibold text-persona-dark">
        {initial}
      </span>
    );
  }
  return (
    <span className="w-11 h-11 shrink-0 rounded-full bg-persona-accent-peach/40 flex items-center justify-center text-persona-dark">
      <HiOutlineSparkles className="w-5 h-5" />
    </span>
  );
}

// ─── Message pieces ─────────────────────────────────────────────────────────────

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

/** Pulsing marker under a reply that's still streaming in. */
function StreamDot() {
  return (
    <motion.span
      aria-hidden
      className="block w-2 h-2 mt-2 rounded-full bg-persona-dark/50"
      animate={{ opacity: [1, 0.25, 1], scale: [1, 0.85, 1] }}
      transition={{ repeat: Infinity, duration: 1 }}
    />
  );
}

/** Copy action under a finished assistant message. Icon morphs into a check. */
function MessageActions({ content, alwaysVisible }) {
  const { t } = useTranslation('chat');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard API can be unavailable (http, old WebViews) — textarea fallback.
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={`flex items-center -ml-2 mt-1 transition-opacity duration-200 ${
        alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
      }`}
    >
      <button
        onClick={copy}
        aria-label={copied ? t('copied') : t('copy')}
        className="flex items-center gap-1.5 h-8 px-2 rounded-full text-xs font-medium text-persona-muted hover:text-persona-dark hover:bg-persona-dark/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
      >
        {copied ? <HiOutlineCheck className="w-4 h-4" /> : <HiOutlineSquare2Stack className="w-4 h-4" />}
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  );
}

// Memoized so typing in the input (which re-renders Conversation on every keystroke)
// doesn't re-parse the whole markdown history — only changed messages re-render.
const MessageBubble = memo(function MessageBubble({
  role,
  content,
  pending,
  error,
  streaming,
  isLast,
  coarse,
  onRetry,
}) {
  const { t } = useTranslation('chat');

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-persona-card border border-persona-line/60 rounded-3xl rounded-br-lg px-4 py-2.5 shadow-warm">
          <p className="text-[15px] leading-relaxed text-persona-dark whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    );
  }

  // Assistant message — full width, serif reading face (the Claude look). The group
  // wrapper drives the hover-revealed actions on pointer devices.
  return (
    <div className="group">
      {content && (
        <div className="font-reading text-persona-dark [&_p]:text-[17px] [&_li]:text-[17px] [&_p]:leading-relaxed [&_li]:leading-relaxed">
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
        </div>
      )}
      {pending && !error && <TypingDots />}
      {streaming && content && <StreamDot />}
      {error && (
        <div className={`flex items-center gap-3 rounded-2xl border border-persona-danger/25 bg-persona-danger/5 px-4 py-3 ${content ? 'mt-2' : ''}`}>
          <p className="flex-1 text-sm text-persona-dark/80">{t('error')}</p>
          <button
            onClick={onRetry}
            className="h-8 px-3 shrink-0 rounded-full bg-white border border-persona-line text-xs font-medium text-persona-dark hover:shadow-warm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
          >
            {t('retry')}
          </button>
        </div>
      )}
      {!pending && !streaming && !error && content && (
        <MessageActions content={content} alwaysVisible={coarse || isLast} />
      )}
    </div>
  );
});

/** Conversation starters shown in an empty chat — one tap sends the question. */
function Starters({ kind, onPick }) {
  const { t } = useTranslation('chat');
  const items = t(kind === 'compatibility' ? 'starters.compat' : 'starters.portrait', {
    returnObjects: true,
  });
  if (!Array.isArray(items)) return null;
  return (
    <div className="w-full max-w-sm flex flex-col gap-2 mt-7">
      {items.map((s, i) => (
        <motion.button
          key={s}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + i * 0.06 }}
          onClick={() => onPick(s)}
          whileTap={{ scale: 0.98 }}
          className="w-full text-left px-4 py-3 rounded-2xl bg-white/80 border border-persona-line/70 text-sm text-persona-dark/80 hover:text-persona-dark hover:bg-white hover:shadow-warm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
        >
          {s}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Composer ───────────────────────────────────────────────────────────────────

// One card: auto-growing textarea + send (→ stop while streaming) inside, with the
// disclaimer line underneath. Lives outside Conversation so re-renders don't remount
// the textarea (which would drop focus mid-word).
const MAX_INPUT_H = 168; // ~6 lines of text-base + padding, then it scrolls internally

function Composer({ value, onChange, onSend, onStop, sending, coarse, autoFocus }) {
  const { t } = useTranslation('chat');
  const taRef = useRef(null);
  const canSend = !!value.trim() && !sending;

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_H)}px`;
  }, [value]);

  // Desktop: focus when the chat opens and again when a reply finishes.
  useEffect(() => {
    if (autoFocus && !sending) taRef.current?.focus();
  }, [autoFocus, sending]);

  const onKeyDown = (e) => {
    // Enter sends only on keyboard-first devices; on touch it makes a newline
    // (matching the ChatGPT / Claude mobile apps).
    if (e.key === 'Enter' && !e.shiftKey && !coarse) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="absolute bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="mx-auto w-full max-w-2xl px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pointer-events-auto">
        <div className="flex items-end gap-2 rounded-[1.75rem] bg-white border border-persona-line/60 shadow-warm-lg p-2 pl-5 transition-colors duration-200 focus-within:border-persona-dark/25">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('inputPlaceholder')}
            className="flex-1 resize-none overflow-y-auto bg-transparent py-2.5 text-base lg:text-[15px] leading-6 text-persona-dark placeholder:text-persona-muted focus:outline-none"
          />
          {sending ? (
            <motion.button
              onClick={onStop}
              aria-label={t('stop')}
              title={t('stop')}
              className="w-11 h-11 shrink-0 rounded-full bg-persona-dark text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2"
              whileTap={{ scale: 0.9 }}
            >
              <span aria-hidden className="w-3 h-3 rounded-[3px] bg-white" />
            </motion.button>
          ) : (
            <motion.button
              onClick={onSend}
              disabled={!canSend}
              aria-label={t('send')}
              className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-persona-dark text-white transition-colors duration-200 disabled:bg-persona-dark/10 disabled:text-persona-dark/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2"
              whileTap={canSend ? { scale: 0.9 } : undefined}
            >
              <HiArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </div>
        <p className="text-[11px] text-persona-muted/80 text-center leading-snug pt-2 px-6">
          {t('disclaimer')}
        </p>
      </div>
    </div>
  );
}

// ─── Conversation ───────────────────────────────────────────────────────────────

function Conversation({ chatId, onBack, locationState, standalone, coarse, onPreview, onRefresh, onLoaded }) {
  const { t } = useTranslation('chat');
  const { user } = useAuth();
  const title = useChatTitle();
  const [chat, setChat] = useState(locationState?.chat || null);
  const [messages, setMessages] = useState(locationState?.chat?.messages || []);
  const [loading, setLoading] = useState(!locationState?.chat?.messages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showJump, setShowJump] = useState(false);
  // Set when a send bounced off the paywall (402): holds the cancelled message
  // so it can re-send itself the moment Pro is confirmed.
  const [paywall, setPaywall] = useState(null); // null | { content }

  const scrollRef = useRef(null);
  const abortRef = useRef(null);
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
        posthog.capture('chat_opened', { chat_kind: r.kind });
        onLoaded?.(r);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Follow the stream downward, but only until the start of the reply reaches the top —
  // then stop, so a long answer can be read from the beginning. Never scrolls up, and
  // never fights a user who scrolls further down themselves.
  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    if (autoFollowRef.current) {
      // The user scrolled away from where we left them → hand control over, stop following.
      if (Math.abs(c.scrollTop - expectedTopRef.current) > 4) {
        autoFollowRef.current = false;
      } else {
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
      }
    }
    setShowJump(c.scrollHeight - c.clientHeight - c.scrollTop > 320);
  }, [messages]);

  const onScroll = () => {
    const c = scrollRef.current;
    if (!c) return;
    setShowJump(c.scrollHeight - c.clientHeight - c.scrollTop > 320);
  };

  const jumpToBottom = () => {
    const c = scrollRef.current;
    if (!c) return;
    if (sending) {
      // Mid-stream: jump instantly and re-arm follow so the reply keeps scrolling.
      anchorElRef.current = null;
      autoFollowRef.current = true;
      c.scrollTop = c.scrollHeight - c.clientHeight;
      expectedTopRef.current = c.scrollTop;
    } else {
      c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    }
  };

  const send = () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    sendContent(content);
  };

  const sendContent = async (content) => {
    setSending(true);

    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;
    anchorIdRef.current = userId; // anchor scroll to this question
    autoFollowRef.current = true; // re-arm follow for this reply (until the user scrolls)
    expectedTopRef.current = scrollRef.current ? scrollRef.current.scrollTop : 0; // baseline
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content, isNew: true },
      { id: assistantId, role: 'assistant', content: '', pending: true, isNew: true },
    ]);
    onPreview?.(chatId, content);

    const append = (delta) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta, pending: false } : m)),
      );

    abortRef.current = new AbortController();
    try {
      const full = await chatApi.sendMessage(chatId, content, {
        onDelta: append,
        signal: abortRef.current.signal,
      });
      posthog.capture('chat_message_sent', { chat_kind: chat?.kind });
      if (full) onPreview?.(chatId, full);
    } catch (err) {
      if (err.name === 'AbortError') {
        // Stopped by the user (or the screen closed): keep whatever already streamed
        // in, drop the placeholder if nothing arrived yet.
        setMessages((prev) =>
          prev
            .filter((m) => !(m.id === assistantId && !m.content))
            .map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
        );
        return;
      }
      if (err.code === 'SUBSCRIPTION_REQUIRED') {
        // The paywall: pretend the send never happened — pull both optimistic
        // bubbles out of the thread, give the text back to the input, and raise
        // the Pro sheet. Subscribing re-sends it; dismissing just leaves the
        // text in the input.
        setMessages((prev) => prev.filter((m) => m.id !== userId && m.id !== assistantId));
        setInput((cur) => cur || content);
        posthog.capture('paywall_shown', { chat_kind: chat?.kind });
        setPaywall({ content });
        onRefresh?.(); // the optimistic list preview never happened — refetch the truth
        return;
      }
      // Keep the question in the thread and turn the reply slot into an inline
      // error with a Retry button — the text isn't lost to a network blip.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, pending: false, error: true, retryContent: content, pairId: userId }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  // Retry a failed exchange: remove the failed pair, then send the same text afresh.
  const retryMessage = (assistantMsg) => {
    setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id && m.id !== assistantMsg.pairId));
    sendContent(assistantMsg.retryContent);
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    abortRef.current?.abort();
    try {
      await chatApi.clear(chatId);
    } catch { /* ignore */ }
    setMessages([]);
    setSending(false);
    onPreview?.(chatId, null);
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={
        standalone
          ? 'fixed inset-0 z-30 bg-persona-bg flex flex-col'
          : 'relative flex-1 min-w-0 min-h-0 bg-persona-bg flex flex-col'
      }
    >
      {/* Top bar — floats over the messages. Text fades into the background as it scrolls
          up (a bg→transparent gradient) and blurs (progressive blur) — the Claude look. */}
      <header className="absolute top-0 inset-x-0 z-40 pointer-events-none">
        <ProgressiveBlur direction="down" className="absolute top-0 inset-x-0 h-24" />
        <div className="relative flex items-center gap-3 px-4 pt-4 pb-3 pointer-events-auto">
          {standalone ? (
            <motion.button
              onClick={onBack}
              aria-label={t('common:back')}
              className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
              whileTap={{ scale: 0.9 }}
            >
              <HiOutlineArrowLeft className="w-5 h-5 text-persona-dark" />
            </motion.button>
          ) : (
            <span aria-hidden className="w-11 h-11 shrink-0" />
          )}
          <p className="flex-1 min-w-0 text-center font-medium text-persona-dark truncate">
            {chat ? title(chat) : ''}
          </p>
          <motion.button
            onClick={() => setConfirmDelete(true)}
            aria-label={t('deleteTitle')}
            disabled={messages.length === 0}
            className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-warm text-persona-dark disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
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
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0, transparent 56px, #000 104px)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, transparent 56px, #000 104px)',
        }}
      >
        {loading ? (
          <div className="mx-auto w-full max-w-2xl px-7 pt-24 space-y-6" aria-hidden>
            <div className="flex justify-end">
              <div className="h-11 w-3/5 rounded-3xl rounded-br-lg bg-white/70 animate-pulse-soft" />
            </div>
            <div className="space-y-2.5">
              <div className="h-4 w-full rounded-full bg-persona-dark/5 animate-pulse-soft" />
              <div className="h-4 w-11/12 rounded-full bg-persona-dark/5 animate-pulse-soft" />
              <div className="h-4 w-4/5 rounded-full bg-persona-dark/5 animate-pulse-soft" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 pb-16">
            <Emblem className="text-6xl mb-5 text-persona-dark/70" />
            <p className="text-sm text-persona-muted max-w-xs leading-relaxed">
              {chat?.kind === 'compatibility'
                ? t('hintCompat', { name: chat?.friendName || t('friendFallback') })
                : t('hintPortrait')}
            </p>
            <Starters kind={chat?.kind} onPick={sendContent} />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl px-7 pt-20 pb-44 space-y-5">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={m.isNew ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                ref={(el) => { if (el && m.id === anchorIdRef.current) anchorElRef.current = el; }}
              >
                <MessageBubble
                  role={m.role}
                  content={m.content}
                  pending={m.pending}
                  error={m.error}
                  streaming={sending && m.id === lastAssistantId && !m.pending && !m.error}
                  isLast={m.id === lastAssistantId}
                  coarse={coarse}
                  onRetry={m.error ? () => retryMessage(m) : undefined}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Soft fade under the composer so messages never collide with it visually. */}
      <div aria-hidden className="absolute bottom-0 inset-x-0 h-36 z-30 pointer-events-none">
        <ProgressiveBlur direction="up" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-persona-bg via-persona-bg/70 to-transparent" />
      </div>

      {/* Jump to latest — appears once the user is far from the bottom. */}
      <AnimatePresence>
        {showJump && (
          <motion.div
            key="jump"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-0 bottom-32 z-40 flex justify-center pointer-events-none"
          >
            <button
              onClick={jumpToBottom}
              aria-label={t('scrollLatest')}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white border border-persona-line/60 shadow-warm-lg flex items-center justify-center text-persona-dark hover:shadow-warm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
            >
              <HiOutlineArrowDown className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Composer
        value={input}
        onChange={setInput}
        onSend={send}
        onStop={() => abortRef.current?.abort()}
        sending={sending}
        coarse={coarse}
        autoFocus={!coarse}
      />

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            title={t('deleteTitle')}
            body={t('deleteBody')}
            confirmLabel={t('deleteConfirm')}
            cancelLabel={t('common:cancel')}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={doDelete}
          />
        )}
      </AnimatePresence>

      {/* The Pro paywall — raised when a send bounces with 402. Closing keeps the
          text in the input; subscribing re-sends the held message automatically. */}
      <AnimatePresence>
        {paywall && (
          <PaywallModal
            user={user}
            onClose={() => setPaywall(null)}
            onSubscribed={() => {
              const content = paywall.content;
              setPaywall(null);
              setInput(''); // the held text is about to send — don't leave a copy behind
              sendContent(content);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Chat list (mobile screen + desktop pane) ───────────────────────────────────

function SearchField({ value, onChange }) {
  const { t } = useTranslation('chat');
  return (
    <div className="relative">
      <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-persona-muted pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="w-full rounded-full bg-white/70 border border-persona-line/60 pl-10 pr-4 py-2.5 text-base lg:text-sm text-persona-dark placeholder:text-persona-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-persona-dark/15 transition-colors"
      />
    </div>
  );
}

function ChatRow({ chat, active, onClick, variant }) {
  const { t, i18n } = useTranslation('chat');
  const title = useChatTitle();
  const time = relativeTime(chat.updatedAt, i18n.language);
  const base = 'w-full flex items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach';
  const skin =
    variant === 'pane'
      ? `px-3 py-2.5 transition-colors duration-150 ${active ? 'bg-white shadow-warm' : 'hover:bg-white/70'}`
      : 'bg-persona-card p-3.5 card-hover';
  return (
    <button onClick={onClick} aria-current={active ? 'true' : undefined} className={`${base} ${skin}`}>
      <ChatAvatar chat={chat} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-persona-dark text-sm truncate flex-1">{title(chat)}</p>
          {time && <span className="text-[11px] text-persona-muted shrink-0 tabular">{time}</span>}
        </div>
        <p className="text-xs text-persona-muted truncate mt-0.5">{chat.lastMessage || t('noMessages')}</p>
      </div>
    </button>
  );
}

function RowSkeletons({ count = 3 }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-white/60 animate-pulse-soft" />
      ))}
    </div>
  );
}

/** Search-filtered rows shared by the mobile screen and the desktop pane. */
function useFilteredChats(chats, query) {
  const title = useChatTitle();
  const q = query.trim().toLowerCase();
  return chats?.filter(
    (c) => !q || title(c).toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q),
  );
}

/** Locked-gate vignette: a two-line preview of what the chat actually does —
    the AI answers *from your results* (the six sigils it "remembers"). */
function ChatLockedVignette() {
  const { t } = useTranslation('chat');
  return (
    <div className="flex flex-col gap-1.5 mb-4 text-left" aria-hidden="true">
      <motion.div
        className="self-end bg-persona-dark text-white rounded-3xl rounded-br-lg px-4 py-2 text-[13px] leading-relaxed max-w-[85%]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
      >
        {t('locked.vignetteUser')}
      </motion.div>
      <motion.div
        className="self-start bg-persona-bg rounded-3xl rounded-bl-lg px-4 py-2.5 max-w-[88%]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.28 }}
      >
        <span className="flex gap-1 mb-1.5">
          {Object.entries(SIGILS).map(([type, { color, Glyph }], i) => (
            <motion.span
              key={type}
              className="w-[18px] h-[18px] rounded-md flex items-center justify-center"
              style={{ backgroundColor: color }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.45 + i * 0.06 }}
            >
              <svg viewBox="-14 -14 28 28" width="11" height="11">
                <Glyph c="rgba(26,26,26,0.72)" />
              </svg>
            </motion.span>
          ))}
        </span>
        <span className="block text-[13px] leading-relaxed text-persona-dark">{t('locked.vignetteAi')}</span>
      </motion.div>
    </div>
  );
}

/** The full-tab gate while tests are unfinished — sells the chat, then routes
    to the tests. Shared by the mobile list screen and the desktop two-pane. */
function ChatLockedGate({ lock, onOpenTests }) {
  const { t } = useTranslation('chat');
  return (
    <LockedCard
      vignette={<ChatLockedVignette />}
      title={t('locked.title')}
      body={t('locked.body')}
      perks={[
        { Icon: HiOutlineSparkles, tint: 'bg-persona-accent-lavender/60', text: t('locked.perk1') },
        { Icon: HiOutlineChatBubbleLeftRight, tint: 'bg-persona-accent-peach/60', text: t('locked.perk2') },
        { Icon: HiOutlineLightBulb, tint: 'bg-persona-accent-yellow/60', text: t('locked.perk3') },
      ]}
      progressLabel={t('locked.progress', { completed: lock.completed, required: lock.required })}
      ctaLabel={lock.completed === 0 ? t('locked.firstTest') : t('locked.continueTests')}
      completed={lock.completed}
      required={lock.required}
      partial={lock.partial}
      onOpenTests={onOpenTests}
    />
  );
}

/** Mobile: the full-screen chat list (the dashboard chrome floats over it). */
function ChatListScreen({ chats, lock, activeId, onOpen, onNew, onOpenTests }) {
  const { t } = useTranslation('chat');
  const [query, setQuery] = useState('');
  const filtered = useFilteredChats(chats, query);
  const ready = chats !== null && lock !== null;

  if (ready && lock && chats.length === 0) {
    return <ChatLockedGate lock={lock} onOpenTests={onOpenTests} />;
  }

  return (
    // Fixed full-screen (no page scroll); the dashboard's top bar + bottom nav float
    // over it. The FAB row is pinned just above the nav and never scrolls.
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-label={t('listTitle')}
      className="fixed inset-0 lg:left-64 z-30 bg-persona-bg flex flex-col"
    >
      <div className="flex-1 min-h-0 flex flex-col px-6 pt-24 lg:pt-12 overflow-hidden">
        {!ready ? (
          <>
            <h1 className="font-display text-3xl font-semibold text-persona-dark mb-4 shrink-0">{t('listTitle')}</h1>
            <RowSkeletons />
          </>
        ) : chats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Emblem className="text-6xl mb-6 text-persona-dark/70" />
            <h2 className="font-display text-xl font-semibold text-persona-dark mb-2">{t('emptyTitle')}</h2>
            <p className="text-sm text-persona-muted max-w-xs leading-relaxed mb-6">{t('emptyBody')}</p>
            <button onClick={onNew} className="btn-primary inline-flex items-center gap-2">
              <HiOutlinePlus className="w-5 h-5" />
              {t('newChat')}
            </button>
          </div>
        ) : (
          <>
            {/* Title + search — pinned above the scrolling list */}
            <h1 className="font-display text-3xl font-semibold text-persona-dark mb-4 shrink-0">{t('listTitle')}</h1>
            {lock && (
              <p className="text-xs text-persona-muted leading-relaxed mb-4 -mt-2 shrink-0">
                {t('locked.listHint', { completed: lock.completed, required: lock.required })}
              </p>
            )}
            <div className="mb-4 shrink-0">
              <SearchField value={query} onChange={setQuery} />
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-persona-muted px-1 pt-2">{t('searchEmpty')}</p>
            ) : (
              <div className="space-y-2 overflow-y-auto pb-2">
                {filtered.map((c) => (
                  <ChatRow key={c.id} chat={c} active={c.id === activeId} onClick={() => onOpen(c)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New-chat button — pinned above the bottom nav, doesn't scroll. Hidden
          while the gate is on (existing chats stay, new ones can't be started). */}
      <div className="shrink-0 flex justify-end px-6 pt-2 pb-[6.5rem] lg:pb-9">
        {ready && !lock && chats.length > 0 && (
          <motion.button
            onClick={onNew}
            aria-label={t('newChat')}
            className="w-14 h-14 shrink-0 rounded-full bg-persona-dark text-white flex items-center justify-center shadow-warm-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
            whileTap={{ scale: 0.9 }}
          >
            <HiOutlinePlus className="w-6 h-6" />
          </motion.button>
        )}
      </div>
    </motion.section>
  );
}

/** Desktop: the always-visible chat column to the left of the conversation. */
function ChatPane({ chats, lock, activeId, onOpen, onNew }) {
  const { t } = useTranslation('chat');
  const [query, setQuery] = useState('');
  const filtered = useFilteredChats(chats, query);

  return (
    <aside
      aria-label={t('listTitle')}
      className="w-80 shrink-0 border-r border-persona-line/70 flex flex-col min-h-0"
    >
      <div className="flex items-center justify-between px-5 pt-7 pb-3 shrink-0">
        <h1 className="font-display text-2xl font-semibold text-persona-dark">{t('listTitle')}</h1>
        {lock === false && (
          <motion.button
            onClick={onNew}
            aria-label={t('newChat')}
            title={t('newChat')}
            className="w-9 h-9 rounded-full bg-persona-dark text-white flex items-center justify-center shadow-warm hover:shadow-warm-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
            whileTap={{ scale: 0.9 }}
          >
            <HiOutlinePlus className="w-5 h-5" />
          </motion.button>
        )}
      </div>
      {lock && chats?.length > 0 && (
        <p className="px-5 pb-3 text-[11px] text-persona-muted leading-relaxed shrink-0">
          {t('locked.listHint', { completed: lock.completed, required: lock.required })}
        </p>
      )}

      {chats === null ? (
        <div className="px-4">
          <RowSkeletons />
        </div>
      ) : chats.length === 0 ? (
        <div className="px-6 pt-10 text-center">
          <Emblem className="text-4xl mb-4 text-persona-dark/60" />
          <p className="text-sm text-persona-muted leading-relaxed">{t('emptyBody')}</p>
        </div>
      ) : (
        <>
          <div className="px-4 pb-3 shrink-0">
            <SearchField value={query} onChange={setQuery} />
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-persona-muted px-2 pt-2">{t('searchEmpty')}</p>
            ) : (
              filtered.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  variant="pane"
                  active={c.id === activeId}
                  onClick={() => onOpen(c)}
                />
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/** Desktop: right side when no conversation is open. */
function EmptyPane({ lock, onNew }) {
  const { t } = useTranslation('chat');
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <Emblem className="text-6xl mb-6 text-persona-dark/60" />
      <h2 className="font-display text-xl font-semibold text-persona-dark mb-2">{t('selectTitle')}</h2>
      <p className="text-sm text-persona-muted max-w-xs leading-relaxed">{t('selectHint')}</p>
      {lock === false && (
        <button onClick={onNew} className="btn-secondary mt-7 inline-flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          {t('newChat')}
        </button>
      )}
    </div>
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
                className="w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3.5 text-left card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
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
                className="w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3.5 text-left card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
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
                className="w-9 h-9 shrink-0 rounded-full bg-persona-card flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
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
                    className="w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3 text-left card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
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

// ─── Root: derive the sub-view from the URL, own the shared chat list ───────────

export default function Chat({ onImmersiveChange, onOpenTests }) {
  const { t } = useTranslation('chat');
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMedia('(min-width: 1024px)');
  const coarse = useMedia('(hover: none)');

  const onChatRoute = location.pathname === '/chat' || location.pathname.startsWith('/chat/');
  const segments = location.pathname.split('/').filter(Boolean);
  const chatId = segments[1] || null;

  // The conversation goes immersive (no dashboard chrome / bottom nav) on mobile only —
  // on desktop the two-pane layout keeps the sidebar, like every desktop chat app.
  const immersive = onChatRoute && !!chatId && !isDesktop;
  useEffect(() => { onImmersiveChange?.(immersive); }, [immersive, onImmersiveChange]);
  useEffect(() => () => onImmersiveChange?.(false), [onImmersiveChange]);

  // The chat list + tests gate live here so the desktop pane and the mobile screen
  // share one copy that survives switching between conversations.
  const [chats, setChats] = useState(null);
  const chatsRef = useRef(null);
  useEffect(() => { chatsRef.current = chats; }, [chats]);
  // null = still checking; { completed, required } = locked; false = unlocked.
  const [lock, setLock] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!onChatRoute) return;
    let active = true;
    fetchTestsCached()
      .then((tests) => {
        if (!active) return;
        const completed = (tests || []).filter(isTestCompleted).length;
        setLock(
          completed >= TOTAL_TESTS
            ? false
            : { completed, required: TOTAL_TESTS, partial: partialTestCredit(tests, isTestCompleted) },
        );
      })
      .catch(() => active && setLock(false));
    return () => { active = false; };
  }, [onChatRoute]);

  const refreshChats = useCallback(
    () => chatApi.list().then(setChats).catch(() => setChats((prev) => prev ?? [])),
    [],
  );
  useEffect(() => {
    if (onChatRoute) refreshChats();
  }, [onChatRoute, refreshChats]);

  // Keep the list fresh without refetching: bump a chat's preview + move it up when
  // a message is sent / a reply lands (mirrors the backend's 140-char snippet).
  const previewChat = useCallback((id, lastMessage) => {
    setChats((prev) => {
      if (!prev) return prev;
      const hit = prev.find((c) => c.id === id);
      if (!hit) return prev;
      const updated = {
        ...hit,
        lastMessage: lastMessage ? lastMessage.slice(0, 140) : null,
        updatedAt: new Date().toISOString(),
      };
      return [updated, ...prev.filter((c) => c.id !== id)];
    });
  }, []);

  // A conversation opened by deep link (or fresh from the Portrait button) may not be
  // in the list yet — fetch the list again so the pane shows it.
  const handleLoaded = useCallback(
    (detail) => {
      const cur = chatsRef.current;
      if (cur && !cur.some((c) => c.id === detail.id)) refreshChats();
    },
    [refreshChats],
  );

  const openChat = useCallback(
    (c) => navigate(`/chat/${c.id}`, { state: { chat: c } }),
    [navigate],
  );

  const startPortrait = async () => {
    setShowNew(false);
    try {
      const chat = await chatApi.openPortrait();
      refreshChats();
      navigate(`/chat/${chat.id}`, { state: { chat } });
    } catch {
      showToast(t('openError'));
    }
  };

  const startCompat = async (friendId) => {
    setShowNew(false);
    try {
      const chat = await chatApi.openCompatibility(friendId);
      refreshChats();
      navigate(`/chat/${chat.id}`, { state: { chat } });
    } catch {
      showToast(t('openError'));
    }
  };

  if (!onChatRoute) return null;

  const sheet = (
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
  );

  if (isDesktop) {
    // Locked with nothing to show — the gate replaces the whole tab, like on mobile.
    if (lock && chats !== null && chats.length === 0) {
      return <ChatLockedGate lock={lock} onOpenTests={onOpenTests} />;
    }
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-label={t('listTitle')}
        className="fixed inset-0 left-64 z-30 bg-persona-bg flex"
      >
        <ChatPane
          chats={chats}
          lock={lock}
          activeId={chatId}
          onOpen={openChat}
          onNew={() => setShowNew(true)}
        />
        {chatId ? (
          <Conversation
            key={`chat-${chatId}`}
            chatId={chatId}
            locationState={location.state}
            standalone={false}
            coarse={coarse}
            onPreview={previewChat}
            onRefresh={refreshChats}
            onLoaded={handleLoaded}
          />
        ) : (
          <EmptyPane lock={lock} onNew={() => setShowNew(true)} />
        )}
        {sheet}
      </motion.section>
    );
  }

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
        standalone
        coarse={coarse}
        onPreview={previewChat}
        onRefresh={refreshChats}
        onLoaded={handleLoaded}
      />
    );
  }

  return (
    <>
      <ChatListScreen
        key="list"
        chats={chats}
        lock={lock}
        activeId={null}
        onOpen={openChat}
        onNew={() => setShowNew(true)}
        onOpenTests={onOpenTests}
      />
      {sheet}
    </>
  );
}
