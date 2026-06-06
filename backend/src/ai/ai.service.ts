import { Injectable } from '@nestjs/common';
import { TestResultType } from '../tests/models/test-result.entity';
import { BIG_FIVE_SYSTEM_PROMPT, buildBigFiveUserPrompt } from './prompts/big-five.prompt';
import { SCHWARTZ_SYSTEM_PROMPT, buildSchwartzUserPrompt } from './prompts/schwartz.prompt';
import { ECR_SYSTEM_PROMPT, buildEcrUserPrompt } from './prompts/ecr.prompt';
import { COPE_SYSTEM_PROMPT, buildCopeUserPrompt } from './prompts/cope.prompt';
import { PID_SYSTEM_PROMPT, buildPidUserPrompt } from './prompts/pid.prompt';
import { PORTRAIT_SYSTEM_PROMPT, buildPortraitUserPrompt } from './prompts/portrait.prompt';

// `@openrouter/sdk` is ESM-only; the backend compiles to CommonJS, so the
// client is loaded via dynamic import() at runtime. This is a type-only alias.
type OpenRouterClient = import('@openrouter/sdk').OpenRouter;

// One entry per test type: the system prompt + a formatter for the user message.
// Add a new test by dropping a prompt file and registering it here.
const INTERPRETERS: Record<string, { system: string; build: (result: any) => string }> = {
  bigFive: { system: BIG_FIVE_SYSTEM_PROMPT, build: buildBigFiveUserPrompt },
  shcwartz: { system: SCHWARTZ_SYSTEM_PROMPT, build: buildSchwartzUserPrompt },
  ecr: { system: ECR_SYSTEM_PROMPT, build: buildEcrUserPrompt },
  cope: { system: COPE_SYSTEM_PROMPT, build: buildCopeUserPrompt },
  pid: { system: PID_SYSTEM_PROMPT, build: buildPidUserPrompt },
};

@Injectable()
export class AiService {
  private clientPromise: Promise<OpenRouterClient> | null = null;

  /**
   * Returns a human-readable interpretation for a test result, or `null` for
   * test types that have no registered interpreter.
   */
  async interpret(testType: string, result: TestResultType): Promise<string | null> {
    const interpreter = INTERPRETERS[testType];
    if (!interpreter) return null;
    return this.complete(interpreter.system, interpreter.build(result));
  }

  /**
   * Synthesizes a single cross-test "portrait" from several results, or `null`
   * if nothing usable was passed in.
   */
  async interpretPortrait(results: { testType: string; result: TestResultType }[]): Promise<string | null> {
    if (!results.length) return null;
    return this.complete(PORTRAIT_SYSTEM_PROMPT, buildPortraitUserPrompt(results));
  }

  private async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = await this.getClient();
    const model = process.env.OPENROUTER_MODEL;
    const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS);

    const completion = await client.chat.send({
      chatRequest: {
        model,
        temperature: 0.7,
        maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
      },
    });

    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('OpenRouter returned an empty completion');
    }
    return content.trim();
  }

  /** Lazily creates (and memoizes) the OpenRouter client. */
  private getClient(): Promise<OpenRouterClient> {
    if (!this.clientPromise) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not configured');
      }
      this.clientPromise = import('@openrouter/sdk').then(
        ({ OpenRouter }) => new OpenRouter({ apiKey, appTitle: 'Persona' }),
      );
    }
    return this.clientPromise;
  }
}
