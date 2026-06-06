import { ShcwartzTestResult } from '../../tests/models/test-result.entity';

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
