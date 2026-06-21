import { I18nContext } from 'nestjs-i18n';

// Thin ergonomic wrappers over nestjs-i18n's request-scoped I18nContext so call
// sites stay terse (t('errors.userNotFound')) instead of repeating
// I18nContext.current() everywhere. Loading, language resolution (Accept-Language),
// the request context and fallback all come from nestjs-i18n (configured in AppModule).

/** Translate a dot-path key in the current request's language. */
export function t(key: string, args?: Record<string, unknown>): string {
  const ctx = I18nContext.current();
  if (!ctx) return key; // outside a request (e.g. bootstrap) — return the key
  return ctx.t(key, args ? { args } : undefined) as string;
}

/** Current request language (falls back to English outside a request). */
export function getLang(): string {
  return I18nContext.current()?.lang ?? 'en';
}
