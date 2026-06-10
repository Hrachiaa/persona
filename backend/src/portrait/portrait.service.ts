import { Injectable, Logger } from '@nestjs/common';
import { TestResultRepository } from '../tests/test-result.repository';
import { AiService } from '../ai/ai.service';
import { PortraitRepository } from './portrait.repository';
import { PortraitDto } from './dtos/portrait.dto';
import { TEST_ORDER } from '../tests/test-order';
import { TestResultType } from '../tests/models/test-result.entity';

@Injectable()
export class PortraitService {
  private readonly logger = new Logger(PortraitService.name);
  // dedupes concurrent generations for the same user (StrictMode double-fetch,
  // multiple tabs, races) so the LLM is called only once per (user, test set)
  private readonly inFlight = new Map<string, Promise<string | null>>();

  constructor(
    private readonly testResultRepository: TestResultRepository,
    private readonly portraitRepository: PortraitRepository,
    private readonly aiService: AiService,
  ) {}

  /**
   * Read-only status for the portrait tab. Generation is triggered when a test is
   * submitted (see `regenerate`), so this never blocks on the LLM during a normal
   * read — it just reports where things stand:
   *   - `locked`     — no usable test results yet
   *   - `ready`      — a cached portrait is available; `refreshing` says whether a
   *                    newer generation is in flight (the client keeps showing this
   *                    one and swaps in the fresh version once it lands)
   *   - `generating` — a first-ever build is in flight and there's nothing cached to
   *                    show yet; the client polls
   * As a fallback (pre-existing users, or a generation that failed) it kicks off a
   * generation when results exist but nothing is cached or in flight.
   */
  async getPortrait(userId: string): Promise<PortraitDto> {
    const results = await this.testResultRepository.getTestResults(userId);
    const targetTests = this.resolveTargetTests(results);
    if (targetTests.length === 0) {
      return PortraitDto.locked(0, 1);
    }

    const refreshing = this.inFlight.has(this.cacheKey(userId, targetTests));

    // Always surface a cached portrait if we have one — even while a newer generation
    // is in flight. The client shows it immediately (no spinner on entry) and swaps in
    // the fresh version, with an animation, once `refreshing` clears.
    const existing = await this.portraitRepository.getByUserId(userId);
    if (existing) {
      return PortraitDto.ready(existing.content, existing.basedOn, {
        updatedAt: existing.updatedAt,
        refreshing,
      });
    }

    // Nothing cached. If a first-ever build is already running, just report it;
    // otherwise kick one off. Either way the client polls until it lands.
    if (!refreshing) {
      void this.dedupedGenerate(userId, targetTests, results);
    }
    return PortraitDto.generating();
  }

  /**
   * Regenerates the portrait from the user's current results. Called after a test
   * is submitted (including retakes — the result content changes even when the set
   * of completed tests doesn't), so the portrait always reflects the latest answers.
   * Best-effort and fire-and-forget safe: never throws.
   */
  async regenerate(userId: string): Promise<void> {
    try {
      const results = await this.testResultRepository.getTestResults(userId);
      const targetTests = this.resolveTargetTests(results);
      if (targetTests.length === 0) return;
      await this.dedupedGenerate(userId, targetTests, results);
    } catch (error) {
      this.logger.error(`Failed to regenerate portrait for userId=${userId}`, error as Error);
    }
  }

  /**
   * The set of tests the portrait is synthesized from, in canonical order. An
   * invalid IQ score doesn't count — it's left out until the user retakes IQ and
   * gets a usable result.
   */
  private resolveTargetTests(results: { testType: string; result: unknown }[]): string[] {
    const iqResult = results.find((r) => r.testType === 'iq');
    const iqInvalid = (iqResult?.result as { reliability?: string } | undefined)?.reliability === 'invalid';
    const completed = new Set(
      results.filter((r) => !(r.testType === 'iq' && iqInvalid)).map((r) => r.testType),
    );
    return TEST_ORDER.filter((t) => completed.has(t));
  }

  private dedupedGenerate(
    userId: string,
    targetTests: readonly string[],
    results: { testType: string; result: unknown }[],
  ): Promise<string | null> {
    const key = this.cacheKey(userId, targetTests);
    let inFlight = this.inFlight.get(key);
    if (!inFlight) {
      inFlight = this.generateAndCache(userId, targetTests, results).finally(() =>
        this.inFlight.delete(key),
      );
      this.inFlight.set(key, inFlight);
    }
    return inFlight;
  }

  /**
   * Generates the portrait and caches it. Best-effort: never throws — on failure
   * it logs and returns null so the caller can surface an error and retry later.
   */
  private async generateAndCache(
    userId: string,
    targetTests: readonly string[],
    results: { testType: string; result: unknown }[],
  ): Promise<string | null> {
    try {
      // Order results by the portrait's test sequence for a stable prompt.
      const ordered = targetTests
        .map((type) => results.find((r) => r.testType === type))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => ({ testType: r.testType, result: r.result as TestResultType }));

      const content = await this.aiService.interpretPortrait(ordered);
      if (content) {
        await this.portraitRepository.upsert(userId, content, [...targetTests]);
      }
      return content;
    } catch (error) {
      this.logger.error(`Failed to generate portrait for userId=${userId}`, error as Error);
      return null;
    }
  }

  private cacheKey(userId: string, targetTests: readonly string[]): string {
    return `${userId}:${[...targetTests].join(',')}`;
  }
}
