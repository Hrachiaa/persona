import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineChevronRight,
  HiOutlineLockClosed,
  HiOutlineGlobeAlt,
  HiOutlineHeart,
  HiOutlineClock,
  HiOutlineArrowRightOnRectangle,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineCheckCircle,
  HiOutlineFilm,
  HiOutlineBookOpen,
  HiOutlineUser,
  HiOutlineCalendarDays,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
  HiHeart,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { recommendationsApi } from '../api/recommendations';
import { subscriptionsApi } from '../api/subscriptions';
import SubscriptionView from './ProfileSubscription';
import i18n, { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { GENDER_OPTIONS, BIRTH_YEAR_MIN, maxBirthYear } from '../utils/constants';

const VIEWS = {
  MAIN: 'main',
  EDIT: 'edit',
  PASSWORD: 'password',
  LIKED: 'liked',
  HISTORY: 'history',
  SUBSCRIPTION: 'subscription',
};

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25, ease: 'easeOut' },
};

function initialsFor(user) {
  const base = user?.name?.trim() || user?.email || '?';
  return base.charAt(0).toUpperCase();
}

/** Map a profile sub-view to its URL (MAIN lives at the bare /profile). */
function viewToPath(view) {
  return view === VIEWS.MAIN ? '/profile' : `/profile/${view}`;
}

export default function Profile({ onBack, onLogout }) {
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // The URL's last segment is the source of truth for the active sub-view.
  const segment = location.pathname.replace(/^\/profile\/?/, '');
  const view = Object.values(VIEWS).includes(segment) ? segment : VIEWS.MAIN;
  const setView = (next) => navigate(viewToPath(next));

  // History (liked + disliked) is fetched once and shared by the Liked and History views.
  const [history, setHistory] = useState(null); // null = not loaded yet
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  // Persona Pro entitlement — drives the status chip on the main list and the
  // Subscription view. Owned here so cancel/subscribe updates both at once.
  const [sub, setSub] = useState(null); // null = loading
  const [subError, setSubError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    subscriptionsApi
      .me()
      .then((data) => { if (!cancelled) setSub(data); })
      .catch(() => { if (!cancelled) setSubError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    recommendationsApi
      .history()
      .then((data) => { if (!cancelled) setHistory(data.items || []); })
      .catch(() => { if (!cancelled) setHistoryError(t('historyLoadError')); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const likedCount = history ? history.filter((i) => i.verdict === 'liked').length : null;
  const historyCount = history ? history.length : null;

  // Like toggle for the Liked / History views. Optimistic — flips locally, reverts on error.
  const toggleVerdict = async (item) => {
    const next = item.verdict === 'liked' ? 'disliked' : 'liked';
    setHistory((prev) => prev.map((i) => (i.id === item.id ? { ...i, verdict: next } : i)));
    try {
      await recommendationsApi.rate(item.id, next.toUpperCase());
    } catch {
      setHistory((prev) => prev.map((i) => (i.id === item.id ? { ...i, verdict: item.verdict } : i)));
    }
  };

  // Back out of a sub-view by popping history (the entry below is /profile MAIN),
  // so we don't pile up /profile entries and create a back-button loop. Fall back
  // to an explicit navigate when there's no history to pop (deep link / refresh).
  const goMain = () => (location.key === 'default' ? navigate('/profile') : navigate(-1));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] bg-persona-bg grain overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-2xl px-6 pt-6 pb-16">
        {/* Back row */}
        <button
          onClick={view === VIEWS.MAIN ? onBack : goMain}
          className="flex items-center gap-2 text-persona-muted hover:text-persona-dark transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded-full px-2 py-1 -ml-2"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">
            {view === VIEWS.MAIN ? t('common:back') : t('title')}
          </span>
        </button>

        <AnimatePresence mode="wait">
          {view === VIEWS.MAIN && (
            <motion.div key="main" {...slide}>
              <MainView
                user={user}
                sub={sub}
                likedCount={likedCount}
                historyCount={historyCount}
                onOpen={setView}
                onLogout={onLogout}
              />
            </motion.div>
          )}

          {view === VIEWS.SUBSCRIPTION && (
            <motion.div key="subscription" {...slide}>
              <SubscriptionView sub={sub} error={subError} onChanged={setSub} />
            </motion.div>
          )}

          {view === VIEWS.EDIT && (
            <motion.div key="edit" {...slide}>
              <EditProfileView onDone={goMain} />
            </motion.div>
          )}

          {view === VIEWS.PASSWORD && (
            <motion.div key="password" {...slide}>
              <ChangePasswordView isGoogle={Boolean(user?.googleId)} onDone={goMain} />
            </motion.div>
          )}

          {view === VIEWS.LIKED && (
            <motion.div key="liked" {...slide}>
              {history ? (
                <LikedView history={history} error={historyError} onToggle={toggleVerdict} />
              ) : (
                <ActivityView
                  title={t('activity.likedTitle')}
                  subtitle={t('activity.likedSubtitle')}
                  items={null}
                  loading={historyLoading}
                  error={historyError}
                  onToggle={toggleVerdict}
                  emptyText={t('activity.likedEmpty')}
                />
              )}
            </motion.div>
          )}

          {view === VIEWS.HISTORY && (
            <motion.div key="history" {...slide}>
              <ActivityView
                title={t('activity.historyTitle')}
                subtitle={t('activity.historySubtitle')}
                items={history}
                loading={historyLoading}
                error={historyError}
                onToggle={toggleVerdict}
                emptyText={t('activity.historyEmpty')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- main view */

/** Short status chip for the Pro row — mirrors SubscriptionView's pills. */
function subStatusLabel(t, sub) {
  if (!sub) return '';
  if (sub.status === 'paused') return t('subscription:profile.statusPaused');
  if (!sub.entitled) return t('subscription:profile.statusFree');
  if (sub.status === 'past_due') return t('subscription:profile.statusPastDue');
  if (sub.cancelAtPeriodEnd) return t('subscription:profile.statusCancelling');
  if (sub.status === 'trialing') return t('subscription:profile.statusTrial');
  return t('subscription:profile.statusActive');
}

function MainView({ user, sub, likedCount, historyCount, onOpen, onLogout }) {
  const { t } = useTranslation('profile');
  const [lang, setLang] = useState(i18n.language);

  // Change the UI language and persist it to the account. Optimistic — the UI
  // switches immediately; a failed save just leaves the local choice in place.
  const onLangChange = (e) => {
    const code = e.target.value;
    setLang(code);
    setLanguage(code);
    authApi.updateLanguage(code).catch(() => {});
  };

  return (
    <div className="space-y-8">
      {/* Identity — tap to edit personal details */}
      <button
        onClick={() => onOpen(VIEWS.EDIT)}
        className="w-full flex items-center gap-4 text-left rounded-3xl p-2 -m-2 hover:bg-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
      >
        <div className="w-16 h-16 shrink-0 rounded-3xl bg-persona-accent-peach/50 flex items-center justify-center text-2xl font-display font-semibold text-persona-dark">
          {initialsFor(user)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold text-persona-dark truncate">
            {user?.name || t('yourProfile')}
          </h1>
          <p className="text-persona-muted text-sm truncate">{user?.email}</p>
          {user?.googleId && (
            <span className="inline-block mt-1 text-[11px] font-medium text-persona-muted bg-persona-line/60 rounded-full px-2 py-0.5">
              {t('googleAccount')}
            </span>
          )}
        </div>
        <HiOutlineChevronRight className="w-5 h-5 shrink-0 text-persona-muted" />
      </button>

      {/* Library */}
      <Section label={t('sections.library')}>
        <Row
          icon={HiOutlineHeart}
          title={t('rows.liked')}
          meta={likedCount === null ? '' : String(likedCount)}
          onClick={() => onOpen(VIEWS.LIKED)}
        />
        <Divider />
        <Row
          icon={HiOutlineClock}
          title={t('rows.history')}
          meta={historyCount === null ? '' : String(historyCount)}
          onClick={() => onOpen(VIEWS.HISTORY)}
        />
      </Section>

      {/* Persona Pro — subscription status & management */}
      <Section label={t('subscription:profile.section')}>
        <Row
          icon={HiOutlineSparkles}
          title={t('subscription:profile.row')}
          meta={subStatusLabel(t, sub)}
          onClick={() => onOpen(VIEWS.SUBSCRIPTION)}
        />
      </Section>

      {/* Account */}
      <Section label={t('sections.account')}>
        <Row
          icon={HiOutlinePencilSquare}
          title={t('rows.editProfile')}
          onClick={() => onOpen(VIEWS.EDIT)}
        />
        <Divider />
        <Row
          icon={HiOutlineLockClosed}
          title={t('rows.changePassword')}
          onClick={() => onOpen(VIEWS.PASSWORD)}
        />
        <Divider />
        {/* Language — applied immediately and persisted to the account */}
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-persona-bg flex items-center justify-center">
            <HiOutlineGlobeAlt className="w-5 h-5 text-persona-dark" />
          </span>
          <span className="flex-1 text-sm font-medium text-persona-dark">{t('common:language')}</span>
          <select
            value={lang}
            onChange={onLangChange}
            aria-label={t('common:language')}
            className="text-sm font-medium text-persona-dark bg-persona-bg rounded-xl px-3 py-2 border border-persona-line focus:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* Sign out */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-white shadow-warm text-red-500 hover:text-red-600 hover:shadow-warm-lg transition-all font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
      >
        <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
        {t('signOut')}
      </button>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="bg-white shadow-warm rounded-3xl overflow-hidden">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-persona-line/70 ml-[4.5rem]" />;
}

function Row({ icon: Icon, title, meta, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-persona-bg/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-inset"
    >
      <span className="w-9 h-9 shrink-0 rounded-xl bg-persona-bg flex items-center justify-center">
        <Icon className="w-5 h-5 text-persona-dark" />
      </span>
      <span className="flex-1 text-sm font-medium text-persona-dark">{title}</span>
      {meta ? <span className="text-sm text-persona-muted tabular">{meta}</span> : null}
      <HiOutlineChevronRight className="w-5 h-5 text-persona-muted" />
    </button>
  );
}

/* -------------------------------------------------------- edit profile view */

function EditProfileView({ onDone }) {
  const { t } = useTranslation('profile');
  const { user, fetchMe } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate ? String(user.birthDate) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const year = parseInt(birthDate, 10);
  const valid =
    name.trim().length > 0 &&
    (gender === 'M' || gender === 'F') &&
    year >= BIRTH_YEAR_MIN &&
    year <= maxBirthYear();

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) {
      setError(t('edit.invalid'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.addProfileInfo({ name: name.trim(), gender, birthDate: year });
      await fetchMe(); // refresh the header / avatar with the new values
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || t('edit.saveError'));
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-persona-dark mb-1">{t('edit.title')}</h2>
      <p className="text-persona-muted text-sm mb-6">{t('edit.subtitle')}</p>

      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="profile-name" className="field-label">{t('edit.nameLabel')}</label>
          <div className="relative">
            <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              placeholder={t('edit.namePlaceholder')}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              className="input-field pl-12"
              required
            />
          </div>
        </div>

        <div>
          <span className="field-label">{t('edit.genderLabel')}</span>
          <div role="radiogroup" aria-label={t('edit.genderLabel')} className="flex gap-3">
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => { setGender(opt.value); setError(null); }}
                  className={`flex-1 py-4 rounded-2xl border-2 transition-all duration-200 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg ${
                    active
                      ? 'border-persona-dark bg-persona-dark/5 shadow-warm'
                      : 'border-persona-line bg-white hover:border-persona-dark/20'
                  }`}
                >
                  <span className="text-2xl block mb-1" aria-hidden="true">{opt.emoji}</span>
                  <span className={`font-medium text-sm ${active ? 'text-persona-dark' : 'text-persona-muted'}`}>
                    {t(opt.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="profile-birthyear" className="field-label">{t('edit.birthYearLabel')}</label>
          <div className="relative">
            <HiOutlineCalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="profile-birthyear"
              type="number"
              inputMode="numeric"
              placeholder={t('edit.birthYearPlaceholder')}
              value={birthDate}
              onChange={(e) => { setBirthDate(e.target.value); setError(null); }}
              className="input-field pl-12 tabular"
              min={BIRTH_YEAR_MIN}
              max={maxBirthYear()}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !valid}
          className="btn-primary w-full text-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('common:saving') : t('common:saveChanges')}
        </button>
      </form>
    </div>
  );
}

/* ----------------------------------------------------------- password view */

function ChangePasswordView({ isGoogle, onDone }) {
  const { t } = useTranslation('profile');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8 || next.length > 32) {
      setError(t('password.lengthError'));
      return;
    }
    if (next !== confirm) {
      setError(t('password.mismatchError'));
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(current, next);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || t('password.changeError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-persona-accent-lime/40 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <HiOutlineCheckCircle className="w-10 h-10 text-persona-dark" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-persona-dark mb-2">{t('password.successTitle')}</h2>
        <p className="text-persona-muted mb-8">{t('password.successSubtitle')}</p>
        <button onClick={onDone} className="btn-primary">{t('common:done')}</button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-persona-dark mb-1">{t('password.title')}</h2>
      <p className="text-persona-muted text-sm mb-6">{t('password.subtitle')}</p>

      {isGoogle && (
        <div className="mb-4 p-4 rounded-2xl bg-persona-accent-lavender/30 text-sm text-persona-dark">
          <Trans t={t} i18nKey="password.googleNote" components={{ b: <span className="font-medium" /> }} />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="current-password" className="field-label">{t('password.currentLabel')}</label>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="current-password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={current}
              onChange={(e) => { setCurrent(e.target.value); setError(null); }}
              className="input-field pl-12 pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? t('password.hidePasswords') : t('password.showPasswords')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach rounded-full p-0.5"
            >
              {show ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="new-password" className="field-label">{t('password.newLabel')}</label>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="new-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('password.newPlaceholder')}
              value={next}
              onChange={(e) => { setNext(e.target.value); setError(null); }}
              className="input-field pl-12"
              minLength={8}
              maxLength={32}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="field-label">{t('password.confirmLabel')}</label>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="confirm-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              className="input-field pl-12"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full text-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('common:saving') : t('password.submit')}
        </button>
      </form>
    </div>
  );
}

/* ----------------------------------------------------------- activity views */

// Liked list with stable membership: the set of liked ids is snapshotted once on entry
// (this only mounts after history has loaded, so the lazy useState init is enough).
// Un-liking an item here just greys its heart — it stays in the list and can be re-liked.
// It disappears only on the next visit, when the component remounts and re-snapshots.
function LikedView({ history, error, onToggle }) {
  const { t } = useTranslation('profile');
  const [snapshot] = useState(
    () => new Set(history.filter((i) => i.verdict === 'liked').map((i) => i.id)),
  );
  const items = history.filter((i) => snapshot.has(i.id));

  return (
    <ActivityView
      title={t('activity.likedTitle')}
      subtitle={t('activity.likedSubtitle')}
      items={items}
      loading={false}
      error={error}
      onToggle={onToggle}
      emptyText={t('activity.likedEmpty')}
    />
  );
}

const MEDIA_TABS = [
  { id: 'all', labelKey: 'common:all' },
  { id: 'film', labelKey: 'common:films' },
  { id: 'book', labelKey: 'common:books' },
];

function ActivityView({ title, subtitle, items, loading, error, emptyText, onToggle }) {
  const { t } = useTranslation('profile');
  const [media, setMedia] = useState('all');
  const filtered = items
    ? media === 'all'
      ? items
      : items.filter((i) => i.mediaType === media)
    : null;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-persona-dark mb-1">{title}</h2>
      <p className="text-persona-muted text-sm mb-5">{subtitle}</p>

      {/* Films / Books split */}
      <div className="inline-flex p-1 bg-white shadow-warm rounded-full mb-6">
        {MEDIA_TABS.map((tab) => {
          const active = media === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMedia(tab.id)}
              className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none ${
                active ? 'text-persona-dark' : 'text-persona-muted hover:text-persona-dark'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`mediaPill-${title}`}
                  className="absolute inset-0 bg-persona-bg rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="text-persona-muted text-sm py-8 text-center animate-pulse-soft">{t('common:loading')}</p>
      )}

      {!loading && error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      {!loading && !error && filtered && filtered.length === 0 && (
        <p className="text-persona-muted text-sm py-8 text-center">
          {items && items.length > 0 ? (media === 'film' ? t('activity.noFilms') : t('activity.noBooks')) : emptyText}
        </p>
      )}

      {!loading && !error && filtered && filtered.length > 0 && (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((item) => (
              <ActivityCard key={item.id} item={item} onToggle={onToggle} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function ActivityCard({ item, onToggle }) {
  const { t } = useTranslation('profile');
  const isFilm = item.mediaType === 'film';
  const liked = item.verdict === 'liked';
  const subtitle = isFilm
    ? [item.year].filter(Boolean).join('')
    : [item.author, item.year].filter(Boolean).join(' · ');

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-4 bg-white shadow-warm rounded-2xl p-3"
    >
      <div className="w-12 h-16 shrink-0 rounded-lg bg-persona-bg overflow-hidden flex items-center justify-center">
        {item.posterUrl ? (
          <img src={item.posterUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : isFilm ? (
          <HiOutlineFilm className="w-5 h-5 text-persona-muted" />
        ) : (
          <HiOutlineBookOpen className="w-5 h-5 text-persona-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-persona-dark truncate">{item.title}</p>
        {subtitle && <p className="text-xs text-persona-muted truncate">{subtitle}</p>}
        <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wide text-persona-muted">
          {isFilm ? t('common:film') : t('common:book')}
        </span>
      </div>
      <motion.button
        onClick={() => onToggle(item)}
        whileTap={{ scale: 0.85 }}
        aria-label={liked ? t('activity.removeLike') : t('activity.like')}
        aria-pressed={liked}
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach ${
          liked ? 'bg-persona-accent-pink/40 text-red-500' : 'bg-persona-bg text-persona-muted hover:text-red-400'
        }`}
      >
        {liked ? <HiHeart className="w-5 h-5" /> : <HiOutlineHeart className="w-5 h-5" />}
      </motion.button>
    </motion.li>
  );
}
