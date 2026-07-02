import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Minimal fire-and-forget toasts for action failures (opening a chat, swiping,
// friend requests…) that previously failed silently. A module-scope emitter so
// any code — including non-component modules — can call showToast() without
// threading React context; <Toaster/> is mounted once in App.
let emit = null;
let seq = 0;

// eslint-disable-next-line react-refresh/only-export-components -- the emitter and its host component belong together; fast-refresh reloading both is fine
export function showToast(message) {
  emit?.({ id: ++seq, message });
}

const TOAST_MS = 4000;
const MAX_VISIBLE = 3;

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    emit = (toast) => {
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), toast]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== toast.id)),
        TOAST_MS,
      );
    };
    return () => {
      emit = null;
    };
  }, []);

  // Sits above the floating bottom nav on mobile; z above modals (z-[80]) so a
  // failure inside a sheet is still visible.
  return createPortal(
    <div className="fixed bottom-24 lg:bottom-8 inset-x-0 z-[90] flex flex-col items-center gap-2 px-6 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role="status"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-auto max-w-sm bg-persona-dark text-white text-sm font-medium rounded-2xl px-4 py-3 shadow-warm-lg text-center"
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
