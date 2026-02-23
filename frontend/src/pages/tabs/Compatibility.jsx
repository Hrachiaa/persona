import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineHeart, HiOutlineHandThumbUp, HiOutlineBolt, HiOutlineSparkles } from 'react-icons/hi2';

const mockResult = {
  percentage: 78,
  alignments: [
    { icon: HiOutlineSparkles, title: 'Shared Curiosity', description: 'Both of you are driven by intellectual exploration and learning.' },
    { icon: HiOutlineHandThumbUp, title: 'Mutual Respect', description: 'You both value independence and give each other room to grow.' },
    { icon: HiOutlineHeart, title: 'Emotional Depth', description: 'Deep, meaningful conversations come naturally to both of you.' },
  ],
  frictions: [
    { icon: HiOutlineBolt, title: 'Decision Speed', description: 'You tend to decide quickly while they prefer more time to reflect.' },
    { icon: HiOutlineBolt, title: 'Social Energy', description: 'Different comfort levels in large social gatherings.' },
  ],
};

function CircleProgress({ percentage }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <motion.circle
          cx="80" cy="80" r={radius}
          fill="none" stroke="#1A1A1A" strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-5xl font-black text-persona-dark"
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

export default function Compatibility() {
  const [email, setEmail] = useState('');
  const [showResult, setShowResult] = useState(false);

  const handleCheck = () => {
    if (email.trim()) setShowResult(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-14 pb-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-persona-dark mb-1">Compatibility</h1>
        <p className="text-persona-muted mb-6">See how well you match with someone</p>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3 mb-8"
      >
        <input
          type="email"
          placeholder="Enter friend's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field flex-1"
        />
        <motion.button
          onClick={handleCheck}
          className="btn-primary px-6 whitespace-nowrap"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          Check
        </motion.button>
      </motion.div>

      {/* Result */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {/* Score Circle */}
            <div className="flex justify-center mb-8">
              <CircleProgress percentage={mockResult.percentage} />
            </div>

            {/* Alignments */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-persona-dark mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm">💚</span>
                Where You Align
              </h2>
              <div className="space-y-3">
                {mockResult.alignments.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.15 }}
                    className="bg-green-50 rounded-2xl p-4 flex items-start gap-3 border border-green-100"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-persona-dark text-sm">{item.title}</h3>
                      <p className="text-xs text-persona-muted leading-relaxed">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Frictions */}
            <div>
              <h2 className="text-lg font-bold text-persona-dark mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-sm">🔥</span>
                Where Friction May Arise
              </h2>
              <div className="space-y-3">
                {mockResult.frictions.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.5 + i * 0.15 }}
                    className="bg-orange-50 rounded-2xl p-4 flex items-start gap-3 border border-orange-100"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-persona-dark text-sm">{item.title}</h3>
                      <p className="text-xs text-persona-muted leading-relaxed">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
