import { EcrResult } from '../../tests/models/test-result.entity';

/** Renders the ECR result into a compact, model-friendly user message. */
export function buildEcrUserPrompt(result: EcrResult): string {
  return [
    `Результаты теста привязанности (ECR):`,
    ``,
    `Тревожность (anxiety): ${result.anxiety}`,
    `Избегание (avoidance): ${result.avoidance}`,
  ].join('\n');
}
