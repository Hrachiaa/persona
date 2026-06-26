import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { HiOutlineShare, HiOutlineCheck } from 'react-icons/hi2';
import { testsApi } from '../../api/tests';

// Single "Share" button shown in the result screen's top bar (in place of the
// brand pill). On phones it opens the native share sheet (which already offers
// copy / send-to-app); on desktops, where there's no Web Share API, it copies
// the link and briefly confirms. One button, one action.
//
// The share token is minted when the result is created and travels on the
// result, so usually no request is needed; we only hit the (idempotent) /share
// endpoint to backfill a token for results created before tokens existed.
export default function ShareResultBar({ test, result }) {
  const { t } = useTranslation('share');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const token = result?.shareToken || (await testsApi.shareTest(test.id)).token;
      const url = `${window.location.origin}/share/${token}`;
      if (navigator.share) {
        await navigator.share({
          title: t('bar.shareTitle'),
          text: t('bar.shareText', { test: test.testName }),
          url,
        });
      } else {
        await copyToClipboard(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // User dismissing the share sheet throws AbortError — not an error.
      if (err?.name !== 'AbortError') console.error('Share failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      disabled={busy}
      aria-label={t('bar.ariaShare')}
      className="h-12 px-5 rounded-full bg-persona-dark text-white flex items-center gap-2 shadow-warm text-base font-medium disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach focus-visible:ring-offset-2 focus-visible:ring-offset-persona-bg"
      whileTap={{ scale: 0.95 }}
    >
      {copied ? (
        <>
          <HiOutlineCheck className="w-5 h-5" /> {t('bar.linkCopied')}
        </>
      ) : (
        <>
          <HiOutlineShare className="w-5 h-5" /> {t('bar.share')}
        </>
      )}
    </motion.button>
  );
}
