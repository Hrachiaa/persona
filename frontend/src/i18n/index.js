import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Supported UI languages. `code` must match the locale folder names under ./locales
// and the values the backend accepts (see AddProfileInfoDto / UpdateLanguageDto).
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

export const DEFAULT_LANGUAGE = 'en';

// Persisted so an anonymous visitor's choice (onboarding/login screens, before we
// know their account) survives reloads. For signed-in users the backend
// `user.language` is the source of truth and is mirrored here on fetchMe.
export const LANG_KEY = 'persona:lang';

function storedLanguage() {
  const stored = localStorage.getItem(LANG_KEY);
  if (SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;
  // Nothing chosen yet — fall back to the browser's language when we support it,
  // so e.g. a Russian visitor's very first screen isn't English.
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  if (SUPPORTED_LANGUAGES.some((l) => l.code === browser)) return browser;
  return DEFAULT_LANGUAGE;
}

// Auto-discover every locale file: ./locales/<lng>/<namespace>.json.
// Adding a new dictionary is just dropping a JSON file in — no edits here.
const modules = import.meta.glob('./locales/*/*.json', { eager: true });
const resources = {};
for (const path of Object.keys(modules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lng, ns] = match;
  resources[lng] ??= {};
  resources[lng][ns] = modules[path].default;
}

i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

// Keep <html lang> in step with the UI language (index.html ships lang="en"),
// so screen readers and the browser's translate prompt see the right language.
document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

/**
 * Switch the active UI language and remember it locally. Backend persistence
 * (for signed-in users) is handled separately by the caller.
 */
export function setLanguage(code) {
  if (!SUPPORTED_LANGUAGES.some((l) => l.code === code)) return;
  localStorage.setItem(LANG_KEY, code);
  i18n.changeLanguage(code);
}

export default i18n;
