import { motion } from 'framer-motion';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import ProgressiveBlur from '../../components/ProgressiveBlur';

// Sticky back-bar shown above immersive (test / result) screens. `rightSlot`,
// when given, replaces the brand pill on the right (used for result-screen
// share actions).
export default function ImmersiveTopBar({ onBack, rightSlot }) {
  return (
    <div className="sticky top-0 z-40">
      {/* Progressive blur — iOS-style: blur ramps down and fades into the content below */}
      <ProgressiveBlur direction="down" className="absolute top-0 inset-x-0 h-28" />
      <div className="relative px-6 pt-4 pb-6 flex items-center justify-between">
        <motion.button
          onClick={onBack}
          aria-label="Back"
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
          whileTap={{ scale: 0.9 }}
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </motion.button>
        {rightSlot ?? (
          <p className="flex items-center gap-2 h-12 px-6 rounded-full bg-white shadow-warm text-lg font-medium text-persona-dark">
            <span className="font-display text-xl">λ</span> Persona
          </p>
        )}
      </div>
    </div>
  );
}
