import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { friendsApi } from '../api/friends';

// Opening a personal invite link. Signed-in visitors send the link's owner a friend
// request immediately, then land on the Friends tab. Signed-out visitors stash the
// token and are routed to sign up; App.jsx finishes the invite once they authenticate.
export default function InvitePage() {
  const { t } = useTranslation('invite');
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState('working'); // 'working' | 'done' | 'error'
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (!user) {
      // Defer until the visitor has an account — picked up in App.jsx after auth.
      localStorage.setItem('pendingInvite', token);
      navigate('/register', { replace: true });
      return;
    }

    friendsApi
      .acceptInvite(token)
      .then(() => {
        setState('done');
        setTimeout(() => navigate('/match', { replace: true }), 1200);
      })
      .catch(() => setState('error'));
  }, [token, user, navigate]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
      {state === 'error' ? (
        <>
          <h1 className="font-display text-3xl font-semibold text-persona-dark mb-2">
            {t('notFound')}
          </h1>
          <p className="text-persona-muted max-w-prose mb-8">
            {t('notFoundBody')}
          </p>
          <button onClick={() => navigate('/match')} className="btn-primary">
            {t('goToFriends')}
          </button>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="animate-pulse-soft text-persona-muted"
        >
          {state === 'done' ? t('sent') : t('adding')}
        </motion.div>
      )}
    </div>
  );
}
