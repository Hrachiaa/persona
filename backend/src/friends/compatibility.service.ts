import { Injectable, Logger } from '@nestjs/common';
import { TestResultRepository } from '../tests/test-result.repository';
import { AiService } from '../ai/ai.service';
import { TEST_ORDER } from '../tests/test-order';
import { TestResultType } from '../tests/models/test-result.entity';
import { FriendsService } from './friends.service';
import { CompatibilityRepository } from './compatibility.repository';
import { CompatibilityDto } from './dtos/compatibility.dto';
import { getLang } from '../i18n/translate';
import { SingleFlight } from '../common/single-flight';

@Injectable()
export class CompatibilityService {
  private readonly logger = new Logger(CompatibilityService.name);
  // Dedupes concurrent generations for the same pair (StrictMode double-fetch,
  // both friends opening it, polling) so the LLM is called once per pair.
  private readonly inFlight = new SingleFlight();

  constructor(
    private readonly testResultRepository: TestResultRepository,
    private readonly compatibilityRepository: CompatibilityRepository,
    private readonly friendsService: FriendsService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Read/trigger for the compatibility screen. Requires the two users to be
   * friends. Compatibility unlocks only once BOTH have completed every test:
   *   - `locked`     — at least one isn't done; report both progress counts
   *   - `ready`      — a cached analysis exists; serve it
   *   - `generating` — both done, nothing cached yet; kick off a build and poll
   */
  async getCompatibility(meId: string, friendId: string): Promise<CompatibilityDto> {
    await this.friendsService.assertFriends(meId, friendId);

    const [myResults, friendResults] = await Promise.all([
      this.testResultRepository.getTestResults(meId),
      this.testResultRepository.getTestResults(friendId),
    ]);

    const myTests = this.completedTests(myResults);
    const friendTests = this.completedTests(friendResults);
    const required = TEST_ORDER.length;
    if (myTests.length < required || friendTests.length < required) {
      return CompatibilityDto.locked(myTests.length, friendTests.length, required);
    }

    const existing = await this.compatibilityRepository.getByPair(meId, friendId);
    if (existing) {
      return CompatibilityDto.ready(existing.content, existing.score, existing.updatedAt);
    }

    void this.inFlight.run(this.cacheKey(meId, friendId), () =>
      this.generateAndCache(meId, friendId, myResults, friendResults, getLang()),
    );
    return CompatibilityDto.generating();
  }

  /** Drop cached compatibilities for a user after they (re)take a test. */
  async invalidateForUser(userId: string): Promise<void> {
    try {
      await this.compatibilityRepository.deleteForUser(userId);
    } catch (error) {
      this.logger.error(`Failed to invalidate compatibility for userId=${userId}`, error as Error);
    }
  }

  private async generateAndCache(
    meId: string,
    friendId: string,
    myResults: { testType: string; result: unknown }[],
    friendResults: { testType: string; result: unknown }[],
    lang: string,
  ): Promise<void> {
    try {
      const a = this.orderedResults(myResults);
      const b = this.orderedResults(friendResults);
      const out = await this.aiService.interpretCompatibility(a, b, lang);
      if (out) {
        await this.compatibilityRepository.upsert(meId, friendId, out.content, out.score);
      }
    } catch (error) {
      this.logger.error(`Failed to generate compatibility ${meId}↔${friendId}`, error as Error);
    }
  }

  /** Results in canonical test order, typed for the prompt builders. */
  private orderedResults(
    results: { testType: string; result: unknown }[],
  ): { testType: string; result: TestResultType }[] {
    return TEST_ORDER.map((type) => results.find((r) => r.testType === type))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({ testType: r.testType, result: r.result as TestResultType }));
  }

  /**
   * Tests that count as completed, in canonical order. An invalid IQ score doesn't
   * count — mirrors PortraitService.resolveTargetTests.
   */
  private completedTests(results: { testType: string; result: unknown }[]): string[] {
    const iqResult = results.find((r) => r.testType === 'iq');
    const iqInvalid =
      (iqResult?.result as { reliability?: string } | undefined)?.reliability === 'invalid';
    const completed = new Set(
      results.filter((r) => !(r.testType === 'iq' && iqInvalid)).map((r) => r.testType),
    );
    return TEST_ORDER.filter((t) => completed.has(t));
  }

  private cacheKey(a: string, b: string): string {
    return [a, b].sort().join(':');
  }
}
