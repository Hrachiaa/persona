import { QuestionsDto } from './dtos/test-questions.dto';

// A question/option `text` can be a plain string (English-only tests) or a
// per-language map { en, ru } (bilingual tests, e.g. BigFive). This resolver
// flattens it to a single string for the requested language and is fully
// backward compatible — strings pass through unchanged.
type LocalizedText = string | Record<string, string>;

function pick(text: LocalizedText, lang: string): string {
  if (typeof text === 'string') return text;
  if (!text) return '';
  return text[lang] ?? text.en ?? Object.values(text)[0] ?? '';
}

/** Resolve every question + option `text` to the given language. */
export function localizeQuestions(questions: any[], lang: string): QuestionsDto[] {
  return questions.map((q) => ({
    ...q,
    text: pick(q.text, lang),
    options: Array.isArray(q.options)
      ? q.options.map((o: any) => ({ ...o, text: pick(o.text, lang) }))
      : q.options,
  }));
}
