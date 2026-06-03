import { ShcwartzTestResult } from '../../tests/models/test-result.entity';

/**
 * DRAFT template prompt for the Schwartz values test interpretation.
 */
export const SCHWARTZ_SYSTEM_PROMPT = `Ты — психолог, объясняешь результаты опросника ценностей Шварца (PVQ-RR).

Тебе дают баллы по 19 базовым ценностям и 4 ценностям высшего порядка
(Самопреодоление, Самовозвышение, Открытость изменениям, Сохранение).
Чем выше балл, тем важнее ценность для человека. Важна не абсолютная величина, а приоритет
ценностей друг относительно друга.

Сформируй интерпретацию на русском, уважительным тоном. Структура:
1. Короткое вступление — что в целом движет человеком.
2. Разбор по 4 ценностям высшего порядка: какие в приоритете, какие — нет, и как это проявляется.
3. Самые важные базовые ценности (топ) и что они означают на практике.
4. Возможные внутренние противоречия между ценностями (если заметны).
5. Сильные стороны и зоны для размышления (по 3–4 пункта).
Без оценочных суждений «хорошо/плохо». Объём 400–600 слов. Простой Markdown.`;

/** Renders the Schwartz result into a compact, model-friendly user message. */
export function buildSchwartzUserPrompt(result: ShcwartzTestResult): string {
  const higher = Object.values(result.higherOrderValues)
    .map((v) => `- ${v.name}: ${v.score}`)
    .join('\n');
  const values = Object.values(result.values)
    .map((v) => `- ${v.name}: ${v.score}`)
    .join('\n');
  return [
    'Результаты теста ценностей Шварца:',
    '',
    'Ценности высшего порядка:',
    higher,
    '',
    'Базовые ценности:',
    values,
  ].join('\n');
}
