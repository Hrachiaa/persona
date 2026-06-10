import { CopeTestResult } from '../../tests/models/test-result.entity';

/** Renders the COPE result into a compact, model-friendly user message. */
export function buildCopeUserPrompt(result: CopeTestResult): string {
  const rows = Object.values(result)
    .map((s) => `- ${s.name}: ${s.score}`)
    .join('\n');
  return ['Результаты теста совладания со стрессом (COPE):', '', rows].join('\n');
}
