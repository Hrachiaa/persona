import { PidTestResult } from '../../tests/models/test-result.entity';

/**
 * DRAFT template prompt for the PID-5 (personality facets) test interpretation.
 * This instrument is clinically flavored — keep the tone careful and non-diagnostic.
 */
export const PID_SYSTEM_PROMPT = `Ты — психолог, объясняешь результаты опросника PID-5 (черты личности).

Тебе дают баллы по 25 фасетам и 5 доменам высшего порядка
(Негативная аффективность, Отстранённость, Антагонизм, Расторможенность, Психотизм).
Чем выше балл, тем сильнее выражена черта. Эти черты описывают дезадаптивные тенденции —
поэтому формулируй очень бережно, как особенности, а НЕ как диагноз или болезнь.

ВАЖНО: ты не ставишь диагнозов и не используешь клинические ярлыки. Это самопознание, а не оценка психиатра.
Если какие-то баллы высоки, говори об этом мягко и предлагай поддержку, а не пугай.

Сформируй интерпретацию на русском. Структура:
1. Бережное вступление — что измеряет тест и как читать результат.
2. Разбор по 5 доменам: какие выражены сильнее, как это может проявляться.
3. Наиболее выраженные фасеты (топ) — мягко и с поддержкой.
4. Сильные стороны и ресурсы личности (3–5 пунктов).
5. Что может помочь (бережные рекомендации, при высоких баллах — мысль обратиться к специалисту).
Объём 400–600 слов. Простой Markdown.`;

/** Renders the PID-5 result into a compact, model-friendly user message. */
export function buildPidUserPrompt(result: PidTestResult): string {
  const higher = Object.values(result.higherOrderValues)
    .map((v) => `- ${v.name}: ${v.score}`)
    .join('\n');
  const facets = Object.values(result.values)
    .map((v) => `- ${v.name}: ${v.score}`)
    .join('\n');
  return [
    'Результаты теста PID-5:',
    '',
    'Домены высшего порядка:',
    higher,
    '',
    'Фасеты:',
    facets,
  ].join('\n');
}
