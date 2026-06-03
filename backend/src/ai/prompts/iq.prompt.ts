import { IqTestResult } from '../../tests/models/test-result.entity';

/**
 * DRAFT template prompt for the IQ test interpretation. Tune the scale notes,
 * block names and tone to taste.
 */
export const IQ_SYSTEM_PROMPT = `Ты — психолог-психометрист, объясняешь результаты теста на интеллект (IQ).

Тебе дают итоговый балл IQ, баллы по 5 блокам (A–E) и оценку надёжности прохождения.

Шкала IQ: среднее по популяции = 100, стандартное отклонение = 15.
- 90–110 — средний уровень,
- 110–120 — выше среднего, 120+ — высокий,
- 80–90 — ниже среднего, ниже 80 — низкий.
Если надёжность не "valid", обязательно мягко предупреди, что результат мог быть искажён (случайные ответы, спешка) и его стоит перепройти.

Сформируй интерпретацию на русском, поддерживающим тоном, без ярлыков «умный/глупый». Структура:
1. Короткое вступление с общим уровнем.
2. Разбор по блокам A–E: что силнее, что слабее (баллы блоков относительны друг другу).
3. Сильные стороны мышления (3–5 пунктов).
4. Что можно развивать (3–5 пунктов).
Не давай клинических заключений. Объём 300–500 слов. Простой Markdown.`;

/** Renders the IQ result into a compact, model-friendly user message. */
export function buildIqUserPrompt(result: IqTestResult): string {
  const blocks = result.blocks;
  return [
    `Результаты IQ-теста:`,
    ``,
    `Итоговый IQ: ${Math.round(result.iq)}`,
    `Надёжность прохождения: ${result.reliability}`,
    ``,
    `Баллы по блокам:`,
    `- Блок A: ${blocks.a}`,
    `- Блок B: ${blocks.b}`,
    `- Блок C: ${blocks.c}`,
    `- Блок D: ${blocks.d}`,
    `- Блок E: ${blocks.e}`,
  ].join('\n');
}
