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

  async getPortrait(userId: string): Promise<PortraitDto> {
    const results = await this.testResultRepository.getTestResults(userId);

    // An invalid IQ score doesn't count toward the portrait — it's left out until
    // the user retakes IQ and gets a usable result.
    const iqResult = results.find((r) => r.testType === 'iq');
    const iqInvalid = (iqResult?.result as { reliability?: string } | undefined)?.reliability === 'invalid';
    const completed = new Set(
      results.filter((r) => !(r.testType === 'iq' && iqInvalid)).map((r) => r.testType),
    );

    // The portrait covers every completed test, in canonical order, and regrows as
    // the user finishes more — a changed set makes the cached `basedOn` stale and
    // triggers a regeneration.
    const targetTests = TEST_ORDER.filter((t) => completed.has(t));
    if (targetTests.length === 0) {
      return PortraitDto.locked(0, 1);
    }

    const existing = await this.portraitRepository.getByUserId(userId);
    if (existing && this.sameSet(existing.basedOn, targetTests)) {
      return PortraitDto.ready(existing.content, existing.basedOn);
    }

    const content = await this.dedupedGenerate(userId, targetTests, results);
    if (!content) return PortraitDto.error();
    return PortraitDto.ready(content, [...targetTests]);
  }

  private dedupedGenerate(
    userId: string,
    targetTests: readonly string[],
    results: { testType: string; result: unknown }[],
  ): Promise<string | null> {
    const key = `${userId}:${[...targetTests].join(',')}`;
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

  private sameSet(a: string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = new Set(a);
    return b.every((t) => sa.has(t));
  }
}
