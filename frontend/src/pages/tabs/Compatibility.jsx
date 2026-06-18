import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
} from 'react-icons/hi2';
import { friendsApi } from '../../api/friends';
import { MARKDOWN_COMPONENTS } from '../../components/markdownComponents';
import { SIGILS } from '../../components/testSigils';
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
        <h1 className="font-display text-3xl font-semibold text-persona-dark mb-6 truncate">{title}</h1>
        {children}
      </div>
    </motion.section>
  );
}

// ─── Friends home: prominent "Add friends" + the friends list ───────────────────

function FriendsHome({ navigate }) {
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
    <ScreenShell label="Friends">
      <button
        onClick={() => navigate('/match/requests')}
        className="w-full mb-8 flex items-center justify-between gap-2 bg-persona-card rounded-2xl p-4 card-hover"
      >
        <span className="flex items-center gap-2 text-persona-dark font-medium text-sm">
          <HiOutlineClock className="w-5 h-5" /> Friend requests
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
          <HiOutlineUsers className="w-5 h-5" /> Your friends
        </h2>
        <motion.button
          onClick={() => navigate('/match/add')}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-persona-dark text-white text-sm font-medium shadow-warm"
          whileTap={{ scale: 0.95 }}
        >
          <HiOutlineUserPlus className="w-4 h-4" /> Add
        </motion.button>
      </div>
      {loading ? (
        <p className="text-sm text-persona-muted px-1">Loading…</p>
      ) : friends.length === 0 ? (
        <div className="text-center text-persona-muted py-10">
          <HiOutlineUserPlus className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No friends yet. Tap “Add friends” to get started.</p>
        </div>
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

function AddFriendView({ navigate, onBack }) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hit, setHit] = useState(null); // search result FriendDto | null

  const [inviteToken, setInviteToken] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    friendsApi.getInviteToken().then((r) => setInviteToken(r.token)).catch(() => {});
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setSearching(true);
    setSearched(true);
    try {
      setHit(await friendsApi.search(value));
    } catch {
      setHit(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (targetId) => {
    const { status } = await friendsApi.sendRequest(targetId);
    setHit((h) => (h && h.id === targetId ? { ...h, relation: status } : h));
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
    <SubScreen label="Add friends" title="Add friends" onBack={onBack}>
      {/* Search by email */}
      <form onSubmit={handleSearch} className="mb-4">
        <label htmlFor="friend-email" className="field-label">
          Find by email
        </label>
        <div className="flex gap-3">
          <input
            id="friend-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field flex-1"
          />
          <motion.button
            type="submit"
            className="btn-primary px-5 whitespace-nowrap flex items-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            <HiOutlineMagnifyingGlass className="w-5 h-5" />
          </motion.button>
        </div>
      </form>

      {/* Search result */}
      <AnimatePresence>
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6"
          >
            {searching ? (
              <p className="text-sm text-persona-muted px-1">Searching…</p>
            ) : hit ? (
              <PersonRow person={hit} trailing={<SearchAction hit={hit} onAdd={handleAdd} navigate={navigate} />} />
            ) : (
              <p className="text-sm text-persona-muted px-1">No one found with that email.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite link */}
      <div className="surface-warm rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-2 text-persona-dark">
          <HiOutlineLink className="w-5 h-5" />
          <h2 className="font-semibold text-sm">Your invite link</h2>
        </div>
        <p className="text-xs text-persona-muted mb-3">
          Share it — whoever opens it sends you a friend request.
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
            {copied ? 'Copied' : 'Copy'}
          </motion.button>
        </div>
      </div>
    </SubScreen>
  );
}

/** The trailing action for a search hit, depending on the relation. */
function SearchAction({ hit, onAdd, navigate }) {
  const [busy, setBusy] = useState(false);
  const relation = hit.relation;

  if (relation === 'self') return <span className="text-xs text-persona-muted shrink-0">You</span>;
  if (relation === 'friends')
    return (
      <button
        onClick={() => navigate(`/match/${hit.id}`, { state: { friend: hit } })}
        className="btn-secondary px-3 py-1.5 text-xs shrink-0"
      >
        View
      </button>
    );
  if (relation === 'pending_out')
    return <span className="text-xs text-persona-muted shrink-0">Requested</span>;
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
        Accept
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
      <HiOutlineUserPlus className="w-4 h-4" /> Add
    </motion.button>
  );
}

// ─── Requests: incoming (accept/decline) + outgoing (cancel) ────────────────────

function RequestsView({ onBack }) {
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
    await fn(friendshipId);
    load();
  };

  return (
    <SubScreen label="Friend requests" title="Requests" onBack={onBack}>
      {loading ? (
        <p className="text-sm text-persona-muted px-1">Loading…</p>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-persona-muted uppercase tracking-wide mb-3">
            Incoming
          </h2>
          {data.incoming.length === 0 ? (
            <p className="text-sm text-persona-muted px-1 mb-8">No incoming requests.</p>
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
                        aria-label="Accept"
                        className="w-9 h-9 rounded-full bg-persona-dark text-white flex items-center justify-center"
                      >
                        <HiOutlineCheck className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => act(friendsApi.decline, p.friendshipId)}
                        aria-label="Decline"
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
            Sent
          </h2>
          {data.outgoing.length === 0 ? (
            <p className="text-sm text-persona-muted px-1">No sent requests.</p>
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
                      Cancel
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
  const [friend, setFriend] = useState(locationState?.friend || null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openTest, setOpenTest] = useState(null); // { testType, testName, result }

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
    await friendsApi.remove(friendId);
    navigate('/match');
  };

  if (openTest) {
    return (
      <ResultView
        test={{ testType: openTest.testType, testName: openTest.testName }}
        result={{ testType: openTest.testType, result: openTest.result }}
        ownerName={friend?.name || 'Your friend'}
        onBack={() => setOpenTest(null)}
        actions={
          <motion.button
            onClick={() => setOpenTest(null)}
            className="btn-secondary w-full"
            whileTap={{ scale: 0.97 }}
          >
            Back
          </motion.button>
        }
      />
    );
  }

  const title = friend?.name || friend?.email || 'Friend';

  return (
    <SubScreen label="Friend" title={title} onBack={() => navigate('/match')}>
      <motion.button
        onClick={() => navigate(`/match/${friendId}/compatibility`)}
        className="btn-primary w-full mb-6 flex items-center justify-center gap-2"
        whileTap={{ scale: 0.98 }}
      >
        <HiOutlineSparkles className="w-5 h-5" /> Check compatibility
      </motion.button>

      <h2 className="text-lg font-semibold text-persona-dark mb-3">Their results</h2>
      {loading ? (
        <p className="text-sm text-persona-muted px-1">Loading…</p>
      ) : !results || results.length === 0 ? (
        <p className="text-sm text-persona-muted px-1">This friend hasn't completed any tests yet.</p>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <PersonRow
              key={r.testType}
              person={{ name: r.testName, email: '' }}
              leading={<TestSigilIcon testType={r.testType} className="w-11 h-11 shrink-0" />}
              onClick={() => setOpenTest(r)}
              trailing={<HiOutlineChevronRight className="w-5 h-5 text-persona-muted shrink-0" />}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleRemove}
        className="mt-8 w-full flex items-center justify-center gap-2 text-sm text-persona-muted hover:text-persona-dark transition-colors py-3"
      >
        <HiOutlineTrash className="w-4 h-4" /> Remove from friends
      </button>
    </SubScreen>
  );
}

// ─── Compatibility: AI analysis + score ring ────────────────────────────────────

function CircleProgress({ percentage }) {
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
        <span className="text-sm text-persona-muted font-medium">compatible</span>
      </div>
    </div>
  );
}

function CompatibilityView({ friendId, navigate, locationState }) {
  const friend = locationState?.friend || null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [nonce, setNonce] = useState(0);

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
  const title = friend?.name || 'Compatibility';

  return (
    <SubScreen label="Compatibility" title={title} onBack={onBack}>
      {loading && !data ? (
        <p className="text-sm text-persona-muted px-1">Loading…</p>
      ) : errored || data?.status === 'error' ? (
        <div className="text-center text-persona-muted py-10">
          <p className="text-sm mb-4">Something went wrong.</p>
          <button onClick={() => setNonce((n) => n + 1)} className="btn-secondary">
            Try again
          </button>
        </div>
      ) : data?.status === 'locked' ? (
        <div className="surface-warm rounded-3xl p-6 text-center">
          <HiOutlineSparkles className="w-10 h-10 mx-auto mb-3 text-persona-muted" />
          <h2 className="font-semibold text-persona-dark mb-1">Not unlocked yet</h2>
          <p className="text-sm text-persona-muted mb-4">
            Compatibility unlocks once you both finish every test.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="font-display text-2xl font-semibold text-persona-dark">
                {data.meDone}/{data.required}
              </p>
              <p className="text-xs text-persona-muted">You</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-persona-dark">
                {data.friendDone}/{data.required}
              </p>
              <p className="text-xs text-persona-muted">{friend?.name || 'Friend'}</p>
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
          <p className="text-sm">Reading you both and writing your compatibility…</p>
        </div>
      ) : data?.status === 'ready' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex justify-center mb-8">
            <CircleProgress percentage={data.score} />
          </div>
          <div className="text-persona-dark">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{data.content}</ReactMarkdown>
          </div>
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
