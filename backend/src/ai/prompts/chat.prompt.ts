import { BUILDERS, TEST_LABELS } from './portrait.prompt';

// Prompts for the interactive AI chat (the "Discuss with AI" feature). Unlike the
// portrait/compatibility prompts — which ask the model to PRODUCE a one-shot
// synthesis — these set the model up as a conversational partner that already
// "knows" the person, with their raw test data AND the synthesis they've already
// read on screen handed to it as context. Tone mirrors the portrait: warm, direct,
// on "ты".

type Result = { testType: string; result: any };

/** Renders one person's available tests into a labelled block (reuses per-test formatters). */
function renderResults(results: Result[]): string {
  return results
    .filter((r) => BUILDERS[r.testType])
    .map((r) => `## Методика: ${TEST_LABELS[r.testType] ?? r.testType}\n\n${BUILDERS[r.testType](r.result)}`)
    .join('\n\n');
}

function languageDirective(lang: string): string {
  return lang === 'en'
    ? 'IMPORTANT: reply in English, addressing the reader as "you", unless they write to you in another language — then match their language.'
    : 'ВАЖНО: отвечай на русском языке, обращаясь к человеку на «ты», если только он сам не пишет на другом языке — тогда отвечай на его языке.';
}

const SHARED_RULES = `
- Опирайся ТОЛЬКО на данные ниже и на ход разговора. Не выдумывай результаты, которых нет.
- Не упоминай названия методик, шкал, аббревиатуры и числа — переводи данные в поведение, чувства, мотивы.
- Будь честен и конкретен, без гороскопной обтекаемости и без лести. Тёплый, умный тон — как очень наблюдательный друг.
- Это диалог, а не отчёт: отвечай живо и по делу, держись темы вопроса, не вываливай всё сразу. Можешь задавать встречные вопросы.
`;

/**
 * System prompt for a PORTRAIT chat — discussing the user with themselves. Gets the
 * user's own raw results plus the portrait they've already read, so the chat stays
 * consistent with what they saw.
 */
export function buildPortraitChatSystemPrompt(params: {
  results: Result[];
  portrait: string | null;
  lang: string;
}): string {
  const { results, portrait, lang } = params;
  return [
    'Ты — тот же проницательный психолог-портретист, который составил портрет личности этого человека. Сейчас вы общаетесь в чате: человек хочет обсудить себя — свой портрет, свои результаты, свои вопросы о себе. Ты уже хорошо его знаешь по данным ниже.',
    '',
    '## Как себя вести',
    SHARED_RULES,
    '',
    '# Результаты тестов этого человека',
    '',
    renderResults(results) || '(результатов пока нет)',
    '',
    portrait
      ? ['# Портрет, который этот человек уже прочитал', '', portrait].join('\n')
      : '',
    '',
    languageDirective(lang),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * System prompt for a COMPATIBILITY chat — the reader (Человек 1) discussing their
 * relationship with a friend (Человек 2). Gets both batteries plus the compatibility
 * analysis the reader has already seen.
 */
export function buildCompatibilityChatSystemPrompt(params: {
  resultsA: Result[];
  resultsB: Result[];
  compatibility: string | null;
  friendName: string | null;
  lang: string;
}): string {
  const { resultsA, resultsB, compatibility, friendName, lang } = params;
  const other = friendName ? `другим человеком (${friendName})` : 'другим человеком';
  return [
    `Ты — тот же проницательный психолог, который разобрал совместимость двух людей. Сейчас вы общаетесь в чате: Человек 1 (читатель, обращайся к нему на «ты») хочет обсудить свои отношения с ${other} (Человек 2). Ты уже знаешь обоих по данным ниже и видишь динамику между ними.`,
    '',
    '## Как себя вести',
    SHARED_RULES,
    '- Говори о паре как о системе: где совпадают, в чём сила связи, где недопонимание и конфликты и как их проживать. О Человеке 2 говори по-человечески («он/она», «другой»).',
    '',
    '# ЧЕЛОВЕК 1 (читатель, «ты»)',
    '',
    renderResults(resultsA) || '(результатов пока нет)',
    '',
    '# ЧЕЛОВЕК 2 (другой человек)',
    '',
    renderResults(resultsB) || '(результатов пока нет)',
    '',
    compatibility
      ? ['# Разбор совместимости, который читатель уже видел', '', compatibility].join('\n')
      : '',
    '',
    languageDirective(lang),
  ]
    .filter(Boolean)
    .join('\n');
}
