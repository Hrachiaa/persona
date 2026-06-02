import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigFiveResults, TestResultType } from '../tests/models/test-result.entity';
import { BIG_FIVE_SYSTEM_PROMPT, buildBigFiveUserPrompt } from './prompts/big-five.prompt';

// `@openrouter/sdk` is ESM-only; the backend compiles to CommonJS, so the
// client is loaded via dynamic import() at runtime. This is a type-only alias.
type OpenRouterClient = import('@openrouter/sdk').OpenRouter;

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

@Injectable()
export class AiService {
  private clientPromise: Promise<OpenRouterClient> | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Returns a human-readable interpretation for a test result, or `null` for
   * test types that don't have an interpreter yet (only `bigFive` for now).
   */
  async interpret(testType: string, result: TestResultType): Promise<string | null> {
    switch (testType) {
      case 'bigFive':
        return this.interpretBigFive(result as BigFiveResults);
      default:
        return null;
    }
  }

  private async interpretBigFive(result: BigFiveResults): Promise<string> {
    return this.complete(BIG_FIVE_SYSTEM_PROMPT, buildBigFiveUserPrompt(result));
  }

  private async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = await this.getClient();
    const model = this.config.get<string>('OPENROUTER_MODEL') ?? DEFAULT_MODEL;

    const completion = await client.chat.send({
      chatRequest: {
        model,
        temperature: 0.7,
        maxTokens: 1500,
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
      const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
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
