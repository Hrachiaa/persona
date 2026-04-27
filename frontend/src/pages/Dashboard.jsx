import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineChartBar,
  HiOutlineHeart,
  HiOutlineBookOpen,
  HiOutlineStar,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import Tests from './tabs/Tests';
import Analysis from './tabs/Analysis';
import Compatibility from './tabs/Compatibility';
import Recommendations from './tabs/Recommendations';
import DailyAdvice from './tabs/DailyAdvice';

const tabs = [
  { id: 'tests', label: 'Tests', icon: HiOutlineClipboardDocumentList },
  { id: 'analysis', label: 'Analysis', icon: HiOutlineChartBar },
  { id: 'match', label: 'Match', icon: HiOutlineHeart },
  { id: 'reads', label: 'Reads', icon: HiOutlineBookOpen },
  { id: 'advice', label: 'Advice', icon: HiOutlineStar },
];

export default function Dashboard({ onLogout }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tests');

  const userName = user?.name || 'User';

  const renderTab = () => {
    switch (activeTab) {
      case 'tests': return <Tests key="tests" />;
      case 'analysis': return <Analysis key="analysis" userName={userName} />;
      case 'match': return <Compatibility key="match" />;
      case 'reads': return <Recommendations key="reads" />;
      case 'advice': return <DailyAdvice key="advice" userName={userName} />;
      default: return <Tests key="tests" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh bg-persona-bg pb-24"
    >
      {/* Top Bar with Logout */}
      <header className="sticky top-0 z-40 bg-persona-bg/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <p className="text-lg font-medium text-persona-dark flex items-center gap-2">
          <span className="font-display text-xl">λ</span> Persona
        </p>
        <motion.button
          onClick={onLogout}
          className="flex items-center gap-2 text-persona-muted hover:text-persona-dark transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg rounded-full px-2 py-1"
          whileTap={{ scale: 0.95 }}
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
          Sign out
        </motion.button>
      </header>

      {/* Tab Content */}
      <section role="region" aria-label="Dashboard content">
        <AnimatePresence mode="wait">
          {renderTab()}
        </AnimatePresence>
      </section>

      {/* Bottom Navigation */}
      <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-persona-line/70 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
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
        {/* iPhone safe area */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </motion.div>
  );
}
