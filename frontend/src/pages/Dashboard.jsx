import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
  HiOutlineHeart,
  HiOutlineBookOpen,
  HiOutlineStar,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import ProgressiveBlur from '../components/ProgressiveBlur';
import Tests from './tabs/Tests';
import Portrait from './tabs/Portrait';
import Compatibility from './tabs/Compatibility';
import Recommendations from './tabs/Recommendations';
import DailyAdvice from './tabs/DailyAdvice';

const tabs = [
  { id: 'tests', label: 'Tests', icon: HiOutlineClipboardDocumentList },
  { id: 'portrait', label: 'Portrait', icon: HiOutlineSparkles },
  { id: 'match', label: 'Match', icon: HiOutlineHeart },
  { id: 'reads', label: 'Reads', icon: HiOutlineBookOpen },
  { id: 'advice', label: 'Advice', icon: HiOutlineStar },
];

export default function Dashboard({ onLogout }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tests');
  const [immersive, setImmersive] = useState(false);

  const userName = user?.name || 'User';

  // Each tab should open at the top — the window otherwise keeps the previous
  // tab's scroll position.
  useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);

  const renderTab = () => {
    switch (activeTab) {
      case 'tests': return <Tests key="tests" onImmersiveChange={setImmersive} onOpenPortrait={() => setActiveTab('portrait')} />;
      case 'portrait': return <Portrait key="portrait" />;
      case 'match': return <Compatibility key="match" />;
      case 'reads': return <Recommendations key="reads" />;
      case 'advice': return <DailyAdvice key="advice" userName={userName} />;
      default: return <Tests key="tests" onImmersiveChange={setImmersive} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-dvh bg-persona-bg ${immersive ? '' : 'pb-24'}`}
    >
      {/* Top Bar with Logout — hidden on immersive (test / result) screens */}
      {!immersive && (
        <header className="sticky top-0 z-40">
          {/* Progressive blur — iOS-style: blur ramps down and fades into the content below */}
          <ProgressiveBlur direction="down" className="absolute top-0 inset-x-0 h-28" />
          <div className="relative px-6 pt-4 pb-6 flex items-center justify-between">
            <p className="flex items-center gap-2 h-12 px-6 rounded-full bg-white shadow-warm text-lg font-medium text-persona-dark">
              <span className="font-display text-xl">λ</span> Persona
            </p>
            <motion.button
              onClick={onLogout}
              className="flex items-center gap-2 h-12 px-6 rounded-full bg-white shadow-warm text-persona-muted hover:text-persona-dark transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
              whileTap={{ scale: 0.95 }}
            >
              <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
              Sign out
            </motion.button>
          </div>
        </header>
      )}

      {/* Tab Content */}
      <section role="region" aria-label="Dashboard content">
        <AnimatePresence mode="wait">
          {renderTab()}
        </AnimatePresence>
      </section>

      {/* Bottom progressive blur — content stays visible behind the nav, just blurred (mirrors the top) */}
      {!immersive && (
        <ProgressiveBlur direction="up" className="fixed bottom-0 inset-x-0 h-32 z-40" />
      )}

      {/* Bottom Navigation — floating capsule; slides away on immersive screens */}
      <motion.nav
        aria-label="Primary"
        animate={{ y: immersive ? 160 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed bottom-4 inset-x-0 z-50 px-6"
      >
        <div className="max-w-lg mx-auto flex items-center justify-around bg-white/90 backdrop-blur-xl border border-persona-line/60 shadow-warm-lg rounded-full py-2 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  isActive ? 'text-persona-dark' : 'text-persona-muted'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <div className="relative">
                  <tab.icon className={`w-6 h-6 transition-all duration-200 ${isActive ? 'scale-110' : ''}`} />
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-persona-dark rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    </motion.div>
  );
}
