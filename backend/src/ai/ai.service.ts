import { Injectable } from '@nestjs/common';
import { TestResultType } from '../tests/models/test-result.entity';
import { PORTRAIT_SYSTEM_PROMPT, buildPortraitUserPrompt } from './prompts/portrait.prompt';

// `@openrouter/sdk` is ESM-only; the backend compiles to CommonJS, so the
// client is loaded via dynamic import() at runtime. This is a type-only alias.
type OpenRouterClient = import('@openrouter/sdk').OpenRouter;

@Injectable()
export class AiService {
  private clientPromise: Promise<OpenRouterClient> | null = null;

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
