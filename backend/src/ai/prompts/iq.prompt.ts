import { IqTestResult } from '../../tests/models/test-result.entity';

/** Renders the IQ result into a compact, model-friendly user message. */
export function buildIqUserPrompt(result: IqTestResult): string {
  return [
    `IQ test results:`,
    ``,
    `Overall IQ: ${Math.round(result.iq)}`,
  ].join('\n');
}
