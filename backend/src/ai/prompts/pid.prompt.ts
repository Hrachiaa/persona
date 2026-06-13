import { PidTestResult } from '../../tests/models/test-result.entity';

/** Renders the PID-5 result into a compact, model-friendly user message. */
export function buildPidUserPrompt(result: PidTestResult): string {
  const facets = Object.values(result.values)
    .map((v) => `- ${v.name}: ${v.score}`)
    .join('\n');
  return [
    'PID-5 results:',
    '',
    'Facets:',
    facets,
  ].join('\n');
}
