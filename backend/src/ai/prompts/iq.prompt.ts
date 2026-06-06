import { IqTestResult } from '../../tests/models/test-result.entity';

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
