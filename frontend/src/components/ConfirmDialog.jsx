import { motion } from 'framer-motion';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

// Confirmation modal for destructive actions (clearing a chat, removing a
// friend). Render inside <AnimatePresence> — enter/exit are animated here.
export default function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onCancel, onConfirm }) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="surface-warm rounded-3xl p-6 w-full max-w-sm text-center"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-persona-accent-pink/40 flex items-center justify-center">
          <HiOutlineExclamationTriangle className="w-6 h-6 text-persona-dark" />
        </div>
        <h2 className="font-display text-lg font-semibold text-persona-dark mb-1.5">{title}</h2>
        <p className="text-sm text-persona-muted leading-relaxed mb-6">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-full bg-persona-accent-pink text-persona-dark font-medium shadow-warm hover:shadow-warm-lg transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
