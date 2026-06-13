import { EcrResult } from '../../tests/models/test-result.entity';

/** Renders the ECR result into a compact, model-friendly user message. */
export function buildEcrUserPrompt(result: EcrResult): string {
  return [
    `Attachment (ECR) results:`,
    ``,
    `Anxiety: ${result.anxiety}`,
    `Avoidance: ${result.avoidance}`,
  ].join('\n');
}
