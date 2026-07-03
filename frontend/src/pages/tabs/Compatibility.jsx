import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  HiOutlineUserPlus,
  HiOutlineUsers,
  HiOutlineLink,
  HiOutlineCheck,
  HiOutlineClipboard,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineArrowPath,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2';
import { friendsApi } from '../../api/friends';
import { chatApi } from '../../api/chat';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';
import { SIGILS } from '../../components/testSigils';
import { showToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ResultView } from './Tests';
import ImmersiveTopBar from './ImmersiveTopBar';

const POLL_INTERVAL_MS = 3000;

// ─── Shared bits ──────────────────────────────────────────────────────────────

function initialOf(person) {
  return (person?.name?.trim() || person?.email || '?').charAt(0).toUpperCase();
}

function Avatar({ person, className = '' }) {
  return (
    <span
      className={`shrink-0 rounded-full bg-persona-accent-peach/50 flex items-center justify-center font-display font-semibold text-persona-dark ${className}`}
    >
      {initialOf(person)}
    </span>
  );
}

/** A test's portrait orb (color + sigil) as a standalone icon — used in a friend's
 *  results list so it speaks the same visual language as the Portrait constellation. */
function TestSigilIcon({ testType, className = '' }) {
  const sig = SIGILS[testType];
  if (!sig) return null;
  const { color, Glyph } = sig;
  return (
    <svg viewBox="-30 -30 60 60" className={className} aria-hidden="true">
      <circle r="30" fill={color} fillOpacity="0.95" />
      <g transform="scale(1.25)">
        <Glyph c="#1A1A1A" />
      </g>
    </svg>
  );
}

/** A row — a leading slot (avatar by default), name/email, and an optional trailing slot. */
function PersonRow({ person, onClick, trailing, leading }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' } : {})}
      className={`w-full flex items-center gap-3 bg-persona-card rounded-2xl p-3 text-left ${
        onClick ? 'card-hover' : ''
      }`}
    >
      {leading ?? <Avatar person={person} className="w-11 h-11" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-persona-dark text-sm truncate">
          {person.name || person.email}
        </p>
        {person.name && <p className="text-xs text-persona-muted truncate">{person.email}</p>}
      </div>
      {trailing}
    </Wrapper>
  );
}

function ScreenShell({ children, label }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      aria-label={label}
      className="px-6 pt-2 pb-6"
    >
      {children}
    </motion.section>
  );
}

// Immersive drill-in screen (friend, add, requests, compatibility). The dashboard
// hides its chrome and the bottom nav for these, so we bring our own sticky back
// bar (the same one the test/result screens use) and a big title heading.
function SubScreen({ title, onBack, label, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      aria-label={label}
    >
      <ImmersiveTopBar onBack={onBack} />
      <div className="px-6 pb-6">
        {title && (
          <h1 className="font-display text-3xl font-semibold text-persona-dark mb-6 truncate">{title}</h1>
        )}
        {children}
      </div>
    </motion.section>
  );
}

// ─── Friends home: prominent "Add friends" + the friends list ───────────────────

function FriendsHome({ navigate }) {
  const { t } = useTranslation('friends');
  const [friends, setFriends] = useState([]);
  const [incomingCount, setIncomingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([friendsApi.list(), friendsApi.requests()])
      .then(([list, reqs]) => {
        setFriends(list);
        setIncomingCount(reqs.incoming.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScreenShell label={t('home.label')}>
      <button
        onClick={() => navigate('/match/requests')}
        className="w-full mb-8 flex items-center justify-between gap-2 bg-persona-card rounded-2xl p-4 card-hover"
      >
        <span className="flex items-center gap-2 text-persona-dark font-medium text-sm">
          <HiOutlineClock className="w-5 h-5" /> {t('home.requests')}
        </span>
        <span className="flex items-center gap-2">
          {incomingCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-persona-dark text-white text-[11px] font-semibold flex items-center justify-center">
              {incomingCount}
            </span>
          )}
          <HiOutlineChevronRight className="w-5 h-5 text-persona-muted" />
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-persona-dark flex items-center gap-2">
          <HiOutlineUsers className="w-5 h-5" /> {t('home.yourFriends')}
        </h2>
        <motion.button
          onClick={() => navigate('/match/add')}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-persona-dark text-white text-sm font-medium shadow-warm"
          whileTap={{ scale: 0.95 }}
        >
          <HiOutlineUserPlus className="w-4 h-4" /> {t('home.add')}
        </motion.button>
      </div>
      {loading ? (
        <p className="text-sm text-persona-muted px-1">{t('common:loading')}</p>
      ) : friends.length === 0 ? (
        // No friends yet — this screen's job is to sell what compatibility gives,
        // not to shrug. Value bullets + a prominent invite CTA.
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-warm rounded-4xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-5 bg-persona-accent-pink/60 rounded-3xl flex items-center justify-center">
            <HiOutlineUsers className="w-8 h-8 text-persona-dark" />
          </div>
          <h3 className="font-display text-xl font-semibold text-persona-dark mb-2">{t('home.emptyTitle')}</h3>
          <p className="text-sm text-persona-muted leading-relaxed max-w-prose mx-auto mb-6">{t('home.emptyBody')}</p>

          <ul className="text-left space-y-3 max-w-xs mx-auto mb-7">
            {[
              { icon: HiOutlineSparkles, tint: 'bg-persona-accent-lavender/60', key: 'home.emptyPerk1' },
              { icon: HiOutlineUsers, tint: 'bg-persona-accent-lime/60', key: 'home.emptyPerk2' },
              { icon: HiOutlineChatBubbleLeftRight, tint: 'bg-persona-accent-peach/60', key: 'home.emptyPerk3' },
            ].map(({ icon: PerkIcon, tint, key }) => (
              <li key={key} className="flex items-start gap-3">
                <span className={`w-8 h-8 shrink-0 rounded-xl ${tint} flex items-center justify-center`}>
                  <PerkIcon className="w-4 h-4 text-persona-dark" />
                </span>
                <span className="text-sm text-persona-dark/85 leading-relaxed pt-1">{t(key)}</span>
              </li>
            ))}
          </ul>

          <motion.button
            onClick={() => navigate('/match/add')}
            className="btn-primary w-full flex items-center justify-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            <HiOutlineLink className="w-5 h-5" /> {t('home.emptyCta')}
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {friends.map((f) => (
            <PersonRow
              key={f.id}
              person={f}
              onClick={() => navigate(`/match/${f.id}`, { state: { friend: f } })}
              trailing={<HiOutlineChevronRight className="w-5 h-5 text-persona-muted shrink-0" />}
            />
          ))}
        </div>
      )}
    </ScreenShell>
  );
}

// ─── Add friends: search by email + personal invite link ────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AddFriendView({ navigate, onBack }) {
  const { t } = useTranslation('friends');
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [hit, setHit] = useState(null); // search result FriendDto | null
  const [notFound, setNotFound] = useState(false);

  const [inviteToken, setInviteToken] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    friendsApi.getInviteToken().then((r) => setInviteToken(r.token)).catch(() => {});
  }, []);

  // Live search: debounce the input and only hit the API once it's a full email,
  // so results appear as you type without a separate "search" press. All state
  // updates happen in async callbacks (never synchronously in the effect body).
  const validEmail = EMAIL_RE.test(email.trim());
  useEffect(() => {
    const value = email.trim().toLowerCase();
    let cancelled = false;
    const id = setTimeout(() => {
      if (!EMAIL_RE.test(value)) {
        setHit(null);
        setNotFound(false);
        setSearching(false);
        return;
      }
      setSearching(true);
      friendsApi
        .search(value)
        .then((r) => {
          if (cancelled) return;
          setHit(r);
          setNotFound(!r);
        })
        .catch(() => {
          if (cancelled) return;
          setHit(null);
          setNotFound(true);
        })
        .finally(() => !cancelled && setSearching(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [email]);

  const handleAdd = async (targetId) => {
    try {
      const { status } = await friendsApi.sendRequest(targetId);
      setHit((h) => (h && h.id === targetId ? { ...h, relation: status } : h));
    } catch {
      showToast(t('actionError'));
    }
  };

  const inviteUrl = inviteToken ? `${window.location.origin}/invite/${inviteToken}` : '';

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = inviteUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <SubScreen label={t('add.label')} onBack={onBack}>
      {/* Invite link */}
      <div className="surface-warm rounded-3xl p-4 mb-8">
        <div className="flex items-center gap-2 mb-2 text-persona-dark">
          <HiOutlineLink className="w-5 h-5" />
          <h2 className="font-semibold text-sm">{t('add.inviteTitle')}</h2>
        </div>
        <p className="text-xs text-persona-muted mb-3">
          {t('add.inviteHint')}
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.target.select()}
            className="input-field flex-1 text-sm text-persona-muted"
          />
          <motion.button
            onClick={copyInvite}
            disabled={!inviteUrl}
            className="btn-secondary px-4 whitespace-nowrap flex items-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            {copied ? <HiOutlineCheck className="w-5 h-5" /> : <HiOutlineClipboard className="w-5 h-5" />}
            {copied ? t('add.copied') : t('add.copy')}
          </motion.button>
        </div>
      </div>

      {/* Search by email — live, as you type */}
      <label htmlFor="friend-email" className="field-label">
        {t('add.findByEmail')}
      </label>
      <div className="relative">
        <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-persona-muted" />
        <input
          id="friend-email"
          name="email"
          type="email"
          autoComplete="off"
          inputMode="email"
          placeholder={t('add.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field w-full pl-11 pr-11"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {searching ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="inline-flex text-persona-muted"
            >
              <HiOutlineArrowPath className="w-5 h-5" />
            </motion.span>
          ) : email ? (
            <button
              type="button"
              onClick={() => setEmail('')}
              aria-label={t('add.clear')}
              className="text-persona-muted hover:text-persona-dark transition-colors"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Search result — only takes space when there's something to show */}
      <AnimatePresence initial={false}>
        {hit ? (
          <motion.div
            key="hit"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <PersonRow person={hit} trailing={<SearchAction hit={hit} onAdd={handleAdd} navigate={navigate} />} />
            </div>
          </motion.div>
        ) : notFound && validEmail && !searching ? (
          <motion.p
            key="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-3 text-sm text-persona-muted px-1"
          >
            {t('add.notFound')}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </SubScreen>
  );
}

/** The trailing action for a search hit, depending on the relation. */
function SearchAction({ hit, onAdd, navigate }) {
  const { t } = useTranslation('friends');
  const [busy, setBusy] = useState(false);
  const relation = hit.relation;

  if (relation === 'self') return <span className="text-xs text-persona-muted shrink-0">{t('action.you')}</span>;
  if (relation === 'friends')
    return (
      <button
        onClick={() => navigate(`/match/${hit.id}`, { state: { friend: hit } })}
        className="btn-secondary px-3 py-1.5 text-xs shrink-0"
      >
        {t('action.view')}
      </button>
    );
  if (relation === 'pending_out')
    return <span className="text-xs text-persona-muted shrink-0">{t('action.requested')}</span>;
  if (relation === 'pending_in')
    return (
      <button
        onClick={async () => {
          setBusy(true);
          await onAdd(hit.id);
          setBusy(false);
        }}
        disabled={busy}
        className="btn-primary px-3 py-1.5 text-xs shrink-0"
      >
        {t('action.accept')}
      </button>
    );
  return (
    <motion.button
      onClick={async () => {
        setBusy(true);
        await onAdd(hit.id);
        setBusy(false);
      }}
      disabled={busy}
      className="btn-primary px-3 py-1.5 text-xs shrink-0 flex items-center gap-1"
      whileTap={{ scale: 0.95 }}
    >
      <HiOutlineUserPlus className="w-4 h-4" /> {t('action.add')}
    </motion.button>
  );
}

// ─── Requests: incoming (accept/decline) + outgoing (cancel) ────────────────────

function RequestsView({ onBack }) {
  const { t } = useTranslation('friends');
  const [data, setData] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    friendsApi
      .requests()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const act = async (fn, friendshipId) => {
    try {
      await fn(friendshipId);
    } catch {
      showToast(t('actionError'));
    }
    load();
  };

  return (
    <SubScreen label={t('requests.label')} title={t('requests.title')} onBack={onBack}>
      {loading ? (
        <p className="text-sm text-persona-muted px-1">{t('common:loading')}</p>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-persona-muted uppercase tracking-wide mb-3">
            {t('requests.incoming')}
          </h2>
          {data.incoming.length === 0 ? (
            <p className="text-sm text-persona-muted px-1 mb-8">{t('requests.noIncoming')}</p>
          ) : (
            <div className="space-y-2 mb-8">
              {data.incoming.map((p) => (
                <PersonRow
                  key={p.friendshipId}
                  person={p}
                  trailing={
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => act(friendsApi.accept, p.friendshipId)}
                        aria-label={t('requests.accept')}
                        className="w-9 h-9 rounded-full bg-persona-dark text-white flex items-center justify-center"
                      >
                        <HiOutlineCheck className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => act(friendsApi.decline, p.friendshipId)}
                        aria-label={t('requests.decline')}
                        className="w-9 h-9 rounded-full bg-persona-bg text-persona-dark flex items-center justify-center"
                      >
                        <HiOutlineXMark className="w-5 h-5" />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}

          <h2 className="text-sm font-semibold text-persona-muted uppercase tracking-wide mb-3">
            {t('requests.sent')}
          </h2>
          {data.outgoing.length === 0 ? (
            <p className="text-sm text-persona-muted px-1">{t('requests.noSent')}</p>
          ) : (
            <div className="space-y-2">
              {data.outgoing.map((p) => (
                <PersonRow
                  key={p.friendshipId}
                  person={p}
                  trailing={
                    <button
                      onClick={() => act(friendsApi.decline, p.friendshipId)}
                      className="btn-secondary px-3 py-1.5 text-xs shrink-0"
                    >
                      {t('common:cancel')}
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </SubScreen>
  );
}

// ─── Friend detail: their test results + compatibility / remove ─────────────────

function FriendDetail({ friendId, navigate, locationState }) {
  const { t } = useTranslation('friends');
  const [friend, setFriend] = useState(locationState?.friend || null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openTest, setOpenTest] = useState(null); // { testType, testName, result }
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let active = true;
    friendsApi
      .getResults(friendId)
      .then((r) => active && setResults(r))
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    // Resolve the friend's name if we arrived without navigation state (deep link).
    if (!friend) {
      friendsApi
        .list()
        .then((list) => active && setFriend(list.find((f) => f.id === friendId) || null))
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [friendId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async () => {
    setConfirmRemove(false);
    try {
      await friendsApi.remove(friendId);
      navigate('/match');
    } catch {
      showToast(t('actionError'));
    }
  };

  if (openTest) {
    return (
      <ResultView
        test={{ testType: openTest.testType, testName: openTest.testName }}
        result={{ testType: openTest.testType, result: openTest.result }}
        ownerName={friend?.name || t('detail.ownerFallback')}
        onBack={() => setOpenTest(null)}
        actions={
          <motion.button
            onClick={() => setOpenTest(null)}
            className="btn-secondary w-full"
            whileTap={{ scale: 0.97 }}
          >
            {t('common:back')}
          </motion.button>
        }
      />
    );
  }

  const title = friend?.name || friend?.email || t('detail.friendFallback');

  return (
    <SubScreen label={t('detail.label')} title={title} onBack={() => navigate('/match')}>
      <motion.button
        onClick={() =>
          navigate(`/match/${friendId}/compatibility`, friend ? { state: { friend } } : undefined)
        }
        className="btn-primary w-full mb-6 flex items-center justify-center gap-2"
        whileTap={{ scale: 0.98 }}
      >
        <HiOutlineSparkles className="w-5 h-5" /> {t('detail.checkCompatibility')}
      </motion.button>

      <h2 className="text-lg font-semibold text-persona-dark mb-3">{t('detail.theirResults')}</h2>
      {loading ? (
        <p className="text-sm text-persona-muted px-1">{t('common:loading')}</p>
      ) : !results || results.length === 0 ? (
        <p className="text-sm text-persona-muted px-1">{t('detail.noTests')}</p>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <PersonRow
              key={r.testType}
              // Localized test name; the backend's testName is English-only.
              person={{ name: t(`tests:names.${r.testType}`, { defaultValue: r.testName }), email: '' }}
              leading={<TestSigilIcon testType={r.testType} className="w-11 h-11 shrink-0" />}
              onClick={() => setOpenTest(r)}
              trailing={<HiOutlineChevronRight className="w-5 h-5 text-persona-muted shrink-0" />}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setConfirmRemove(true)}
        className="mt-8 w-full flex items-center justify-center gap-2 text-sm text-persona-muted hover:text-persona-dark transition-colors py-3"
      >
        <HiOutlineTrash className="w-4 h-4" /> {t('detail.remove')}
      </button>

      <AnimatePresence>
        {confirmRemove && (
          <ConfirmDialog
            title={t('detail.removeTitle', { name: title })}
            body={t('detail.removeBody')}
            confirmLabel={t('detail.removeConfirm')}
            cancelLabel={t('common:cancel')}
            onCancel={() => setConfirmRemove(false)}
            onConfirm={handleRemove}
          />
        )}
      </AnimatePresence>
    </SubScreen>
  );
}

// ─── Compatibility: AI analysis + score ring ────────────────────────────────────

function CircleProgress({ percentage }) {
  const { t } = useTranslation('friends');
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#E8E5DC" strokeWidth="8" />
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-display text-5xl font-semibold text-persona-dark"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.8 }}
        >
          {percentage}%
        </motion.span>
        <span className="text-sm text-persona-muted font-medium">{t('compat.compatible')}</span>
      </div>
    </div>
  );
}

function CompatibilityView({ friendId, navigate, locationState }) {
  const { t } = useTranslation('friends');
  const [friend, setFriend] = useState(locationState?.friend || null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [openingChat, setOpeningChat] = useState(false);

  // Resolve the friend's name on a deep link / refresh (no navigation state).
  useEffect(() => {
    if (friend) return undefined;
    let active = true;
    friendsApi
      .list()
      .then((list) => active && setFriend(list.find((f) => f.id === friendId) || null))
      .catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId]);

  // Open (or resume) the compatibility chat with this friend and jump into it.
  const discussWithAi = async () => {
    if (openingChat) return;
    setOpeningChat(true);
    try {
      const chat = await chatApi.openCompatibility(friendId);
      navigate(`/chat/${chat.id}`, { state: { chat } });
    } catch {
      showToast(t('chat:openError'));
      setOpeningChat(false);
    }
  };

  useEffect(() => {
    let active = true;
    friendsApi
      .getCompatibility(friendId)
      .then((r) => active && setData(r))
      .catch(() => active && setErrored(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [friendId, nonce]);

  // Poll while the server is building the analysis.
  useEffect(() => {
    if (data?.status !== 'generating') return;
    const id = setTimeout(() => setNonce((n) => n + 1), POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [data, nonce]);

  const onBack = () => navigate(`/match/${friendId}`, friend ? { state: { friend } } : undefined);
  const title = friend?.name || t('compat.titleFallback');

  return (
    <SubScreen label={t('compat.label')} title={title} onBack={onBack}>
      {loading && !data ? (
        <p className="text-sm text-persona-muted px-1">{t('common:loading')}</p>
      ) : errored || data?.status === 'error' ? (
        <div className="text-center text-persona-muted py-10">
          <p className="text-sm mb-4">{t('compat.error')}</p>
          <button onClick={() => setNonce((n) => n + 1)} className="btn-secondary">
            {t('common:retry')}
          </button>
        </div>
      ) : data?.status === 'locked' ? (
        <div className="surface-warm rounded-3xl p-6 text-center">
          <HiOutlineSparkles className="w-10 h-10 mx-auto mb-3 text-persona-muted" />
          <h2 className="font-semibold text-persona-dark mb-1">{t('compat.lockedTitle')}</h2>
          <p className="text-sm text-persona-muted mb-4">
            {t('compat.lockedBody')}
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="font-display text-2xl font-semibold text-persona-dark">
                {data.meDone}/{data.required}
              </p>
              <p className="text-xs text-persona-muted">{t('compat.you')}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-persona-dark">
                {data.friendDone}/{data.required}
              </p>
              <p className="text-xs text-persona-muted">{friend?.name || t('compat.friendFallback')}</p>
            </div>
          </div>
        </div>
      ) : data?.status === 'generating' ? (
        <div className="surface-warm rounded-3xl p-6 flex items-start gap-3 text-persona-muted">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
            className="inline-flex mt-0.5"
          >
            <HiOutlineArrowPath className="w-5 h-5" />
          </motion.span>
          <p className="text-sm">{t('compat.generating')}</p>
        </div>
      ) : data?.status === 'ready' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex justify-center mb-8">
            <CircleProgress percentage={data.score} />
          </div>
          {/* Same editorial treatment as the portrait — this is the other long-form
              AI essay, so it reads in the same serif at essay size. */}
          <div className="portrait-prose font-reading text-persona-dark [&_p]:text-[17px] [&_p]:leading-[1.75] [&_p]:text-persona-dark/90 [&_p]:mb-5 [&_li]:text-[17px] [&_li]:leading-[1.75] [&_li]:text-persona-dark/90">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{data.content}</ReactMarkdown>
          </div>

          {/* Talk the relationship through with the AI. */}
          <motion.button
            onClick={discussWithAi}
            disabled={openingChat}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-60"
            whileTap={{ scale: 0.97 }}
          >
            <HiOutlineChatBubbleLeftRight className="w-5 h-5" /> {t('chat:discuss')}
          </motion.button>
        </motion.div>
      ) : null}
    </SubScreen>
  );
}

// ─── Router: derive the sub-view from the URL ───────────────────────────────────

export default function Compatibility({ onImmersiveChange }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Dashboard keeps this tab mounted and animates it OUT with `mode="wait"` when
  // switching tabs, so `location.pathname` keeps updating to the new tab's path while
  // we're still exiting. If we re-derived the sub-view from that, a friend-detail
  // screen would structurally swap to the friends list mid-exit — which wedges
  // framer's exit callback so the next tab never mounts. Rendering nothing once we're
  // off /match lets the exit complete cleanly (and avoids work on a hidden tab).
  const onMatchRoute =
    location.pathname === '/match' || location.pathname.startsWith('/match/');

  // Drill-in sub-screens (anything below /match) go immersive: the dashboard hides
  // its top bar + bottom nav so they read as a focused screen with their own back
  // bar. The home list (/match) keeps the chrome. Reset on leave / unmount.
  const immersive = onMatchRoute && location.pathname !== '/match';
  useEffect(() => {
    onImmersiveChange?.(immersive);
  }, [immersive, onImmersiveChange]);
  useEffect(() => () => onImmersiveChange?.(false), [onImmersiveChange]);

  if (!onMatchRoute) return null;

  const segments = location.pathname.split('/').filter(Boolean);
  const sub = segments[1] || null; // 'requests' | 'add' | friendId | null
  const isRequests = sub === 'requests';
  const isAdd = sub === 'add';
  const friendId = sub && sub !== 'requests' && sub !== 'add' ? sub : null;
  const isCompatibility = friendId && segments[2] === 'compatibility';

  if (isAdd) {
    return <AddFriendView key="add" navigate={navigate} onBack={() => navigate('/match')} />;
  }
  if (isCompatibility) {
    return (
      <CompatibilityView
        key={`compat-${friendId}`}
        friendId={friendId}
        navigate={navigate}
        locationState={location.state}
      />
    );
  }
  if (friendId) {
    return (
      <FriendDetail
        key={`friend-${friendId}`}
        friendId={friendId}
        navigate={navigate}
        locationState={location.state}
      />
    );
  }
  if (isRequests) {
    return <RequestsView key="requests" onBack={() => navigate('/match')} />;
  }
  return <FriendsHome key="home" navigate={navigate} />;
}
