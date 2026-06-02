import { motion } from 'framer-motion';
import {
  HiOutlineLightBulb,
  HiOutlinePuzzlePiece,
  HiOutlineShieldCheck,
  HiOutlineRocketLaunch,
  HiOutlineExclamationTriangle,
  HiOutlineCloudArrowDown,
  HiOutlineBolt,
} from 'react-icons/hi2';

const strengths = [
  {
    icon: HiOutlineLightBulb,
    title: 'Strategic Thinking',
    description: 'You naturally see the big picture and plan several steps ahead.',
    color: 'bg-persona-accent-yellow',
    iconColor: 'text-persona-dark',
  },
  {
    icon: HiOutlinePuzzlePiece,
    title: 'Independent Problem Solver',
    description: 'You thrive when tackling complex challenges on your own terms.',
    color: 'bg-persona-accent-lavender',
    iconColor: 'text-persona-dark',
  },
  {
    icon: HiOutlineShieldCheck,
    title: 'Decisiveness',
    description: 'You make confident decisions based on logic and analysis.',
    color: 'bg-persona-accent-lime',
    iconColor: 'text-persona-dark',
  },
  {
    icon: HiOutlineRocketLaunch,
    title: 'Visionary Mindset',
    description: 'You constantly envision possibilities and improvements.',
    color: 'bg-persona-accent-blue',
    iconColor: 'text-persona-dark',
  },
];

const riskZones = [
  {
    icon: HiOutlineExclamationTriangle,
    title: 'Emotional Overwhelm',
    description: 'High-stress social situations can drain your energy and cause withdrawal.',
    color: 'bg-persona-accent-peach/40',
    iconColor: 'text-persona-dark',
  },
  {
    icon: HiOutlineCloudArrowDown,
    title: 'Perfectionism Paralysis',
    description: 'Overthinking details may slow you down when speed is needed.',
    color: 'bg-persona-accent-peach/30',
    iconColor: 'text-persona-dark',
  },
  {
    icon: HiOutlineBolt,
    title: 'Impatience with Others',
    description: "You may become frustrated when others don't match your pace or logic.",
    color: 'bg-persona-accent-yellow/40',
    iconColor: 'text-persona-dark',
  },
];

export default function Analysis({ userName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-2 pb-6"
    >
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-persona-accent-peach/30 rounded-3xl p-8 mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-persona-accent-lavender/40 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-persona-accent-yellow/40 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <motion.div
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-warm"
            whileHover={{ rotate: 5, scale: 1.05 }}
          >
            <span className="text-3xl">🧠</span>
          </motion.div>
          <h1 className="font-display text-4xl font-semibold text-persona-dark mb-1">{userName || 'Alex'}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-persona-dark text-white text-sm font-medium px-4 py-1.5 rounded-md">
              INTJ
            </span>
            <span className="text-persona-muted font-medium">— The Strategist</span>
          </div>
          <p className="text-persona-muted mt-3 text-sm leading-relaxed">
            Imaginative and strategic thinkers with a plan for everything. INTJs are one of the rarest types, making up just 2% of the population.
          </p>
        </div>
      </motion.div>

      {/* Strengths */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-xl font-semibold text-persona-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-persona-accent-lime/40 rounded-lg flex items-center justify-center">💪</span>
          Strengths
        </h2>
        <div className="grid gap-3">
          {strengths.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="surface-warm rounded-2xl p-5 flex items-start gap-4 card-hover"
            >
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-persona-dark mb-1">{item.title}</h3>
                <p className="text-sm text-persona-muted leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Risk Zones */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-xl font-semibold text-persona-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-persona-accent-peach/40 rounded-lg flex items-center justify-center">⚡</span>
          Risk Zones
        </h2>
        <div className="grid gap-3">
          {riskZones.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="surface-warm rounded-2xl p-5 flex items-start gap-4 card-hover"
            >
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-persona-dark mb-1">{item.title}</h3>
                <p className="text-sm text-persona-muted leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
