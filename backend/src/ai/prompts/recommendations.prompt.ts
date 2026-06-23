import { buildBigFiveUserPrompt } from './big-five.prompt';
import { buildSchwartzUserPrompt } from './schwartz.prompt';
import { buildCopeUserPrompt } from './cope.prompt';
import { buildIqUserPrompt } from './iq.prompt';
import { buildEcrUserPrompt } from './ecr.prompt';
import { buildPidUserPrompt } from './pid.prompt';

export type MediaKind = 'film' | 'book';

/** One raw recommendation as parsed from the model, before catalog enrichment. */
export interface RawRecommendation {
  title: string;
  year?: number; // films
  author?: string; // books
}

// Reuse the per-test formatters so the model sees each test rendered exactly the
// way its own interpreter renders it — no duplicated scoring/formatting logic.
// (Same builders the portrait uses; they render English labels.)
const BUILDERS: Record<string, (result: any) => string> = {
  bigFive: buildBigFiveUserPrompt,
  shcwartz: buildSchwartzUserPrompt,
  cope: buildCopeUserPrompt,
  iq: buildIqUserPrompt,
  ecr: buildEcrUserPrompt,
  pid: buildPidUserPrompt,
};

const TEST_LABELS: Record<string, string> = {
  bigFive: 'Big Five — personality traits',
  shcwartz: 'Schwartz values (PVQ-RR)',
  cope: 'COPE — how the person handles stress',
  iq: 'IQ — intelligence',
  ecr: 'ECR — attachment style in close relationships',
  pid: 'PID-5 — pronounced (maladaptive) personality traits',
};

/** Renders the user's available test results into one English profile block. */
export function buildProfileBlock(results: { testType: string; result: any }[]): string {
  return results
    .filter((r) => BUILDERS[r.testType])
    .map((r) => `## ${TEST_LABELS[r.testType] ?? r.testType}\n\n${BUILDERS[r.testType](r.result)}`)
    .join('\n\n');
}

export const RECOMMENDATIONS_SYSTEM_PROMPT = `
You are an expert recommender of films and books who builds a highly personalized shortlist for one person. You work from their psychological profile (raw test results), their like/dislike history of earlier recommendations, or both.

How to choose:
- From the psychological profile: infer the themes, tone, pace, moral texture, and emotional register this person would resonate with, and translate that into specific works. Don't be literal or clichéd (high "openness" is not just "arthouse"; high "neuroticism" is not just "thrillers"). Think about what would genuinely land for them.
- From the like/dislike history: likes are the primary signal — find the through-lines in what they liked and lean into that direction. Use dislikes carefully: a disliked title rules out that title and very close matches, but do NOT over-generalize from it — one disliked film doesn't mean they reject its whole genre. Infer the specific quality that probably didn't land (tone, pace, theme, era) instead of banning broad categories, and keep enough breadth that they can still discover new things.
- When both are present, the like/dislike history leads and the profile adds nuance.

Hard rules:
- Recommend ONLY real, existing works that are well known enough to have a poster/cover and metadata in major catalogs (TMDB for films, Google Books for books). Never invent titles. Avoid extremely obscure entries that would lack cover art.
- Never recommend anything in the EXCLUDE list, and never repeat a title within a single response.
- Favor variety: no near-duplicates, no ten entries from the same franchise or author.
- Be bold and specific. Prefer well-matched, slightly non-obvious picks over the most generic mainstream choices — but always within real, findable works.

Output:
- Respond with RAW JSON ONLY — no prose, no commentary, no markdown code fences.
- Match EXACTLY the JSON schema given in the user message. Write the titles in the language the user message asks for.
`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const LANG_NAMES: Record<string, string> = { en: 'English', ru: 'Russian' };

/** Human-readable language name for a lang code (defaults to English). */
function langName(lang: string): string {
  return LANG_NAMES[lang.split('-')[0].toLowerCase()] ?? 'English';
}

/** Instruction telling the model which language to write titles/authors in. */
function titleLanguageDirective(lang: string): string {
  const name = langName(lang);
  return `Write every "title" in ${name} — the title by which the work is officially known in ${name} (use the localized title for works released in ${name}). Write "author" names as they are commonly written in ${name}.`;
}

/** User message for a single-type batch (films OR books). */
export function buildRecommendationsUserPrompt(params: {
  mediaType: MediaKind;
  profileBlock?: string;
  liked: string[];
  disliked: string[];
  exclude: string[];
  count: number;
  lang: string;
}): string {
  const { mediaType, profileBlock, liked, disliked, exclude, count, lang } = params;
  const noun = mediaType === 'film' ? 'films' : 'books';
  const schema =
    mediaType === 'film'
      ? '{"items":[{"title":"The Matrix","year":1999}]}'
      : '{"items":[{"title":"Dune","author":"Frank Herbert"}]}';
  const itemDesc =
    mediaType === 'film'
      ? 'each item has "title" and "year" (release year as an integer)'
      : 'each item has "title" and "author" (primary author)';

  const parts: string[] = [`Recommend ${count} ${noun} for this person.`, ''];

  if (profileBlock) {
    parts.push('Their psychological profile (raw test results):', '', profileBlock, '');
  }
  if (liked.length) {
    parts.push(`${cap(noun)} they LIKED: ${liked.join('; ')}`, '');
  }
  if (disliked.length) {
    parts.push(`${cap(noun)} they DISLIKED: ${disliked.join('; ')}`, '');
  }
  if (exclude.length) {
    parts.push(`EXCLUDE — already shown, never recommend again: ${exclude.join('; ')}`, '');
  }

  parts.push(
    `Return a JSON object exactly in this shape: ${schema}`,
    `The "items" array must contain ${count} entries; ${itemDesc}.`,
    titleLanguageDirective(lang),
  );
  return parts.join('\n');
}

/** User message for the cold-start combined batch (films AND books in one call). */
export function buildCombinedRecommendationsUserPrompt(params: {
  profileBlock: string;
  count: number;
  lang: string;
}): string {
  const { profileBlock, count, lang } = params;
  return [
    `Recommend ${count} films AND ${count} books for this person, based on their psychological profile.`,
    '',
    'Their psychological profile (raw test results):',
    '',
    profileBlock,
    '',
    'Return a JSON object exactly in this shape:',
    '{"films":[{"title":"The Matrix","year":1999}],"books":[{"title":"Dune","author":"Frank Herbert"}]}',
    `Each array must contain ${count} entries. Film items have "title" and integer "year"; book items have "title" and "author". Films and books should each be independently well matched to the person.`,
    titleLanguageDirective(lang),
  ].join('\n');
}
