import { useTranslation } from 'react-i18next';
import i18n, { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';

/** EN / RU pill switch — used by the landing footer and the legal pages. */
export default function LangToggle({ className = '' }) {
  const { t } = useTranslation('common');
  return (
    <div
      role="group"
      aria-label={t('language')}
      className={`flex items-center rounded-full border border-persona-line bg-white/70 p-0.5 ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((l) => {
        const active = i18n.language === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-persona-accent-peach ${
              active ? 'bg-persona-dark text-white' : 'text-persona-muted hover:text-persona-dark'
            }`}
          >
            {l.code}
          </button>
        );
      })}
    </div>
  );
}
