import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { HiArrowLeft } from 'react-icons/hi2';
import LangToggle from '../components/LangToggle';

/* ------------------------------------------------------------------ */
/* Public legal documents — /terms, /privacy, /refunds. Paddle's       */
/* verification requires all three to be reachable without an account, */
/* so these routes sit outside requireAuth and outside the Dashboard.  */
/* Content lives entirely in the `legal` i18n namespace (EN + RU) as   */
/* arrays of { h, p[], list[] } sections, so updating a policy is a    */
/* JSON edit, not a component edit.                                    */
/* ------------------------------------------------------------------ */

// Route path per document, in the order they cross-link at the bottom.
const DOCS = [
  ['terms', '/terms'],
  ['privacy', '/privacy'],
  ['refunds', '/refunds'],
];

function Section({ section }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-display text-xl font-semibold tracking-tight text-persona-dark sm:text-2xl">
        {section.h}
      </h2>
      {section.p?.map((paragraph, i) => (
        <p key={i} className="mt-3 text-[15px] leading-relaxed text-persona-dark/80">
          {paragraph}
        </p>
      ))}
      {section.list?.length ? (
        <ul className="mt-3 space-y-2.5">
          {section.list.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-persona-dark/80">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-persona-dark/30" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** `doc` is one of 'terms' | 'privacy' | 'refunds'. */
export default function Legal({ doc }) {
  const { t } = useTranslation('legal');
  const sections = t(`${doc}.sections`, { returnObjects: true });
  const title = t(`${doc}.title`);

  // These are the pages Paddle (and search engines) crawl standalone, so give
  // each one a real document title instead of the SPA's default.
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Persona`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [doc]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-dvh"
    >
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/welcome" className="btn-ghost -ml-2 inline-flex items-center gap-2 text-sm">
            <HiArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('home')}
          </Link>
          <LangToggle />
        </div>

        <header className="mt-8 border-b border-persona-line pb-8">
          <p className="flex items-center gap-2 text-lg font-medium tracking-tight text-persona-dark">
            <span className="font-display text-xl">λ</span> Persona
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-persona-dark sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-persona-muted">
            {t('updated')}
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-persona-dark/80">{t(`${doc}.intro`)}</p>
        </header>

        <article className="mt-10">
          {Array.isArray(sections) &&
            sections.map((section, i) => <Section key={i} section={section} />)}
        </article>

        <footer className="mt-16 border-t border-persona-line pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-persona-muted">
            {t('alsoRead')}
          </p>
          <nav className="mt-3 flex flex-wrap gap-1" aria-label={t('alsoRead')}>
            {DOCS.filter(([key]) => key !== doc).map(([key, path]) => (
              <Link key={key} to={path} className="btn-ghost text-sm">
                {t(`docs.${key}`)}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-xs text-persona-muted">
            {t('operator.name')} · {t('operator.form')} · {t('operator.email')}
          </p>
        </footer>
      </div>
    </motion.div>
  );
}
