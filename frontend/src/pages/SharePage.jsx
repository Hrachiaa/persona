import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { testsApi } from '../api/tests';
import { ResultView } from './tabs/Tests';

// Public, unauthenticated view of a result a user shared. Anyone with the link
// can open it — it shows the exact same result screen the owner sees, only the
// footer actions differ:
//   • signed-out visitor → a CTA to take the test themselves
//   • signed-in visitor  → no sign-up prompt (it isn't their result), just a way
//                           back to their own tests
export default function SharePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let active = true;
    testsApi
      .getSharedResult(token)
      .then((data) => active && setState({ status: 'ready', data }))
      .catch(() => active && setState({ status: 'error', data: null }));
    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-pulse-soft text-persona-muted">Loading…</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-display text-3xl font-semibold text-persona-dark mb-2">Result not found</h1>
        <p className="text-persona-muted max-w-prose mb-8">This share link is invalid or has expired.</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Discover Persona
        </button>
      </div>
    );
  }

  const { testType, testName, ownerName, result } = state.data;
  // Match the shape the result screens expect from the owner flow ({ result }).
  const sharedResult = { testType, result };

  // Footer actions, and (for signed-out visitors) a compact CTA pinned in the
  // top bar so the "take the test" call is visible without scrolling past long
  // result lists. Signed-in visitors get neither prompt — it isn't their result.
  const actions = user ? (
    <motion.button
      onClick={() => navigate('/tests')}
      className="btn-secondary w-full"
      whileTap={{ scale: 0.97 }}
    >
      Back to your tests
    </motion.button>
  ) : (
    <>
      <motion.button
        onClick={() => navigate('/')}
        className="btn-primary w-full"
        whileTap={{ scale: 0.97 }}
      >
        Discover your Persona
      </motion.button>
      <p className="text-center text-sm text-persona-muted">
        {ownerName ? `${ownerName} shared their ${testName} result.` : `A ${testName} result was shared with you.`}{' '}
        Curious how you compare?
      </p>
    </>
  );

  const headerCta = user ? undefined : (
    <motion.button
      onClick={() => navigate('/')}
      className="h-12 px-5 rounded-full bg-persona-dark text-white flex items-center gap-2 shadow-warm text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
      whileTap={{ scale: 0.95 }}
    >
      Take the test <HiOutlineArrowRight className="w-5 h-5" />
    </motion.button>
  );

  return (
    <ResultView
      test={{ testType, testName }}
      result={sharedResult}
      ownerName={ownerName || 'This person'}
      onBack={() => navigate('/')}
      actions={actions}
      headerRightSlot={headerCta}
    />
  );
}
