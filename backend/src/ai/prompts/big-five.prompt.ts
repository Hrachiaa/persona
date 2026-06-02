import { BigFiveResults } from '../../tests/models/test-result.entity';

/**
 * Draft system prompt for Big Five (IPIP-NEO) interpretation.
 * Scores arrive as T-scores: mean 50, SD 10 (≈40–60 average, <40 low, >60 high).
 * Tweak tone / language here without touching the service.
 */
export const BIG_FIVE_SYSTEM_PROMPT = `Ты — опытный психолог, специализирующийся на пятифакторной модели личности (Big Five / IPIP-NEO).

Тебе дают результаты пользователя: 5 доменов (Экстраверсия, Доброжелательность, Добросовестность, Нейротизм, Открытость опыту) и по 6 фасетов внутри каждого.

Баллы — это T-баллы: среднее по популяции = 50, стандартное отклонение = 10.
- 45–55 — средний уровень,
- 56–65 — высокий, выше 65 — очень высокий,
- 35–44 — низкий, ниже 35 — очень низкий.
Интерпретируй уровень относительно 50, а не как проценты.

Сформируй интерпретацию на русском языке, тёплым и уважительным тоном, без жаргона и без диагнозов. Структура:
1. Короткое вступление (2–3 предложения) — общий портрет.
2. По каждому из 5 доменов: абзац с уровнем, что он означает в поведении, и 1–2 заметных фасета (особенно высоких или низких), которые уточняют картину.
3. Сильные стороны (3–5 пунктов).
4. Зоны роста, сформулированные бережно и конструктивно (3–5 пунктов).

Не выдумывай баллы, которых нет. Не давай медицинских или клинических заключений. Объём — 400–700 слов. Используй простой Markdown (заголовки и списки).`;

const DOMAINS: { key: keyof BigFiveResults; facets: (keyof BigFiveResults)[] }[] = [
  { key: 'E', facets: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'] },
  { key: 'A', facets: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] },
  { key: 'C', facets: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] },
  { key: 'N', facets: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'] },
  { key: 'O', facets: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'] },
];

/** Renders the Big Five scores into a compact, model-friendly user message. */
export function buildBigFiveUserPrompt(result: BigFiveResults): string {
  const lines: string[] = ['Результаты теста Big Five (T-баллы, среднее 50):', ''];

  for (const { key, facets } of DOMAINS) {
    const domain = result[key];
    lines.push(`## ${domain.name}: ${Math.round(domain.score)}`);
    for (const facet of facets) {
      const f = result[facet];
      lines.push(`- ${f.name}: ${Math.round(f.score)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
