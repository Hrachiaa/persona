import { PidTestResult } from '../../tests/models/test-result.entity';

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
