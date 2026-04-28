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
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#E8E5DC" strokeWidth="8" />
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
          className="font-display text-5xl font-semibold text-persona-dark tabular"
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
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      aria-label="Compatibility"
      className="px-6 pt-14 pb-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-4xl font-semibold text-persona-dark mb-1">Compatibility</h1>
        <p className="text-persona-muted mb-6">See how you align with someone you know.</p>
      </motion.div>

      {/* Input */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={(e) => { e.preventDefault(); handleCheck(); }}
        className="mb-8"
      >
        <label htmlFor="compat-email" className="field-label">Their email</label>
        <div className="flex gap-3">
          <input
            id="compat-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field flex-1"
          />
          <motion.button
            type="submit"
            className="btn-primary px-6 whitespace-nowrap"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Check
          </motion.button>
        </div>
      </motion.form>

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
              <h2 className="text-lg font-semibold text-persona-dark mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-persona-accent-lime/40 rounded-lg flex items-center justify-center text-sm">💚</span>
                Where you align
              </h2>
              <div className="space-y-3">
                {mockResult.alignments.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.15 }}
                    className="bg-persona-accent-lime/20 rounded-2xl p-4 flex items-start gap-3"
                  >
                    <div className="w-10 h-10 bg-persona-accent-lime/50 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-persona-dark" />
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
              <h2 className="text-lg font-semibold text-persona-dark mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-persona-accent-peach/40 rounded-lg flex items-center justify-center text-sm">🔥</span>
                Where friction may arise
              </h2>
              <div className="space-y-3">
                {mockResult.frictions.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.5 + i * 0.15 }}
                    className="bg-persona-accent-peach/20 rounded-2xl p-4 flex items-start gap-3"
                  >
                    <div className="w-10 h-10 bg-persona-accent-peach/50 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-persona-dark" />
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
    </motion.section>
  );
}
