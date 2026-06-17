import { Injectable } from '@nestjs/common';
import { TestResultType } from '../tests/models/test-result.entity';
import { PORTRAIT_SYSTEM_PROMPT, buildPortraitUserPrompt } from './prompts/portrait.prompt';
import {
  RECOMMENDATIONS_SYSTEM_PROMPT,
  buildRecommendationsUserPrompt,
  buildCombinedRecommendationsUserPrompt,
  MediaKind,
  RawRecommendation,
} from './prompts/recommendations.prompt';
import {
  COMPATIBILITY_SYSTEM_PROMPT,
  buildCompatibilityUserPrompt,
} from './prompts/compatibility.prompt';

// `@openrouter/sdk` is ESM-only; the backend compiles to CommonJS, so the
// client is loaded via dynamic import() at runtime. This is a type-only alias.
type OpenRouterClient = import('@openrouter/sdk').OpenRouter;

@Injectable()
export class AiService {
  private clientPromise: Promise<OpenRouterClient> | null = null;

  /**
   * Synthesizes a single cross-test "portrait" from several results, or `null`
   * if nothing usable was passed in. When `complete` is set (every test in the
   * battery is done), the synthesis is routed to a stronger model.
   */
  async interpretPortrait(
    results: { testType: string; result: TestResultType }[],
    options: { complete?: boolean } = {},
  ): Promise<string | null> {
    if (!results.length) return null;
    return this.complete(PORTRAIT_SYSTEM_PROMPT, buildPortraitUserPrompt(results), options.complete ?? false);
  }

  /**
   * Generates a single-type batch (films OR books). `profileBlock` is the rendered
   * test results — omitted once the like/dislike history alone is a strong enough
   * signal. Returns the raw picks (title + year/author); catalog enrichment happens
   * downstream. Best-effort: returns [] if the model output can't be parsed.
   */
  async recommend(params: {
    mediaType: MediaKind;
    profileBlock?: string;
    liked: string[];
    disliked: string[];
    exclude: string[];
    count: number;
  }): Promise<RawRecommendation[]> {
    const json = await this.completeJson(
      RECOMMENDATIONS_SYSTEM_PROMPT,
      buildRecommendationsUserPrompt(params),
    );
    return this.normalizeList(json?.items, params.mediaType);
  }

  /**
   * Cold-start: films AND books in a single call (saves a round-trip when both
   * queues are generated for the first time right after the tests are completed).
   */
  async recommendCombined(params: {
    profileBlock: string;
    count: number;
  }): Promise<{ films: RawRecommendation[]; books: RawRecommendation[] }> {
    const json = await this.completeJson(
      RECOMMENDATIONS_SYSTEM_PROMPT,
      buildCombinedRecommendationsUserPrompt(params),
    );
    return {
      films: this.normalizeList(json?.films, 'film'),
      books: this.normalizeList(json?.books, 'book'),
    };
  }

  /**
   * Synthesizes a compatibility analysis across two people's full test batteries.
   * Returns markdown `content` + a 0–100 `score`, or `null` if the model output
   * can't be parsed. Both batteries are assumed complete (gating is upstream).
   */
  async interpretCompatibility(
    resultsA: { testType: string; result: TestResultType }[],
    resultsB: { testType: string; result: TestResultType }[],
  ): Promise<{ content: string; score: number } | null> {
    const json = await this.completeJson(
      COMPATIBILITY_SYSTEM_PROMPT,
      buildCompatibilityUserPrompt(resultsA, resultsB),
    );
    const content = typeof json?.markdown === 'string' ? json.markdown.trim() : '';
    if (!content) return null;
    const rawScore = Number(json?.score);
    const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 50;
    return { content, score };
  }

  /** Runs a completion and parses its body as JSON (defensively). */
  private async completeJson(systemPrompt: string, userPrompt: string): Promise<any> {
    const raw = await this.complete(systemPrompt, userPrompt, false);
    return this.extractJson(raw);
  }

  /**
   * Pulls a JSON object out of a model response — tolerates ```json fences and
   * stray prose around the object. Throws if no parseable object is found.
   */
  private extractJson(raw: string): any {
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
    return JSON.parse(text);
  }

  /** Validates/normalizes a raw model array into well-formed recommendations. */
  private normalizeList(arr: unknown, mediaType: MediaKind): RawRecommendation[] {
    if (!Array.isArray(arr)) return [];
    const out: RawRecommendation[] = [];
    for (const it of arr) {
      const title = typeof it?.title === 'string' ? it.title.trim() : '';
      if (!title) continue;
      if (mediaType === 'film') {
        const year = Number.parseInt(String(it?.year), 10);
        out.push({ title, year: Number.isFinite(year) ? year : undefined });
      } else {
        const author = typeof it?.author === 'string' ? it.author.trim() : '';
        out.push({ title, author: author || undefined });
      }
    }
    return out;
  }

  private async complete(systemPrompt: string, userPrompt: string, complete: boolean): Promise<string> {
    const client = await this.getClient();
    // Full battery (all tests done) → the synthesis is the most valuable, so use
    // the stronger model if one is configured; otherwise fall back to the default.
    const model = (complete && process.env.OPENROUTER_MODEL_COMPLETE) || process.env.OPENROUTER_MODEL;
    const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS);

    const completion = await client.chat.send({
      chatRequest: {
        model,
        temperature: 1,
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
