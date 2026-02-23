import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineClipboardDocumentList, HiOutlineChartBar, HiOutlineHeart, HiOutlineBookOpen, HiOutlineStar } from 'react-icons/hi2';
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

export default function Dashboard({ userData }) {
  const [activeTab, setActiveTab] = useState('tests');

  const renderTab = () => {
    switch (activeTab) {
      case 'tests': return <Tests key="tests" />;
      case 'analysis': return <Analysis key="analysis" userName={userData.name || 'Alex'} />;
      case 'match': return <Compatibility key="match" />;
      case 'reads': return <Recommendations key="reads" />;
      case 'advice': return <DailyAdvice key="advice" userName={userData.name || 'Alex'} />;
      default: return <Tests key="tests" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-persona-bg pb-24"
    >
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {renderTab()}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-colors duration-200 ${
                  isActive ? 'text-persona-dark' : 'text-gray-400'
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
      </div>
    </motion.div>
  );
}
