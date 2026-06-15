import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TestResultRepository } from '../tests/test-result.repository';
import { TEST_ORDER } from '../tests/test-order';
import { AiService } from '../ai/ai.service';
import { CatalogService, EnrichedItem } from './catalog.service';
import { RecommendationRepository } from './recommendation.repository';
import { buildProfileBlock, MediaKind } from '../ai/prompts/recommendations.prompt';
import { RecommendationHistoryDto, RecommendationListDto, toHistoryItemDto, toItemDto } from './dtos/recommendation.dto';

const BATCH_REQUEST = 12; // titles asked of the model per generation (one call, no backfill)
const PREFETCH_THRESHOLD = 17; // start the next batch once the queue drops to this many cards
const DROP_PROFILE_AFTER = 20; // stop sending test results once this many are rated (per type)
const EMPTY_GEN_COOLDOWN_MS = 15000; // min gap between generations that start from an empty queue

type GenContext = { profileBlock?: string; liked: string[]; disliked: string[] };

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  // Dedupes concurrent generations per (user, mediaType). The combined cold-start
  // holds both type keys at once so neither type double-generates while it runs.
  private readonly inFlight = new Map<string, Promise<void>>();
  // Last time a generation was kicked off from an empty queue, per (user, type).
  // Throttles re-generation when batches keep coming back empty (e.g. catalog keys
  // unset) so a polling client can't spin the LLM.
  private readonly lastEmptyGen = new Map<string, number>();

  constructor(
    private readonly repo: RecommendationRepository,
    private readonly testResultRepository: TestResultRepository,
    private readonly ai: AiService,
    private readonly catalog: CatalogService,
  ) {}

  /** Read for GET — never blocks on the LLM; kicks off generation and reports status. */
  async getRecommendations(userId: string, mediaType: MediaKind): Promise<RecommendationListDto> {
    const results = await this.testResultRepository.getTestResults(userId);
    const completed = this.resolveTargetTests(results);
    if (completed.length < TEST_ORDER.length) {
      return RecommendationListDto.locked(mediaType, completed.length, TEST_ORDER.length);
    }

    const queue = await this.repo.getQueue(userId, mediaType);
    if (queue.length > 0) {
      if (queue.length <= PREFETCH_THRESHOLD && !this.isGenerating(userId, mediaType)) {
        void this.dedupedGenerate(userId, mediaType);
      }
      return RecommendationListDto.ready(mediaType, queue.map(toItemDto), this.isGenerating(userId, mediaType));
    }

    // Empty queue: build a batch — combined on a truly cold start, else per-type.
    if (!this.isGenerating(userId, mediaType)) {
      const key = `${userId}:${mediaType}`;
      // If we just generated from empty and it's still empty, the batch produced
      // nothing usable — don't re-hit the LLM on every poll; report "no items".
      if (Date.now() - (this.lastEmptyGen.get(key) ?? 0) < EMPTY_GEN_COOLDOWN_MS) {
        return RecommendationListDto.ready(mediaType, [], false);
      }
      this.lastEmptyGen.set(key, Date.now());
      const total = await this.repo.countAll(userId);
      if (total === 0) void this.dedupedGenerateCombined(userId);
      else void this.dedupedGenerate(userId, mediaType);
    }
    return RecommendationListDto.generating(mediaType);
  }

  /** Liked + disliked items the user has swiped, newest first — the profile history feed. */
  async getHistory(userId: string): Promise<RecommendationHistoryDto> {
    const rows = await this.repo.getRated(userId);
    return { items: rows.map(toHistoryItemDto) };
  }

  async swipe(userId: string, itemId: string, verdict: 'LIKED' | 'DISLIKED'): Promise<{ pending: number }> {
    const item = await this.repo.setVerdict(userId, itemId, verdict);
    if (!item) throw new NotFoundException('Recommendation not found or already swiped');
    const mediaType: MediaKind = item.mediaType === 'FILM' ? 'film' : 'book';
    const pending = await this.repo.countPending(userId, mediaType);
    if (pending <= PREFETCH_THRESHOLD && !this.isGenerating(userId, mediaType)) {
      void this.dedupedGenerate(userId, mediaType);
    }
    return { pending };
  }

  async reset(userId: string, mediaType: MediaKind): Promise<void> {
    await this.repo.deleteByType(userId, mediaType);
    void this.dedupedGenerate(userId, mediaType);
  }

  // ---- generation ----------------------------------------------------------

  private isGenerating(userId: string, mediaType: MediaKind): boolean {
    return this.inFlight.has(`${userId}:${mediaType}`);
  }

  private dedupedGenerate(userId: string, mediaType: MediaKind): Promise<void> {
    const key = `${userId}:${mediaType}`;
    let inFlight = this.inFlight.get(key);
    if (!inFlight) {
      inFlight = this.generateBatch(userId, mediaType)
        .catch((e) => this.logger.error(`generate ${mediaType} failed for userId=${userId}`, e as Error))
        .finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, inFlight);
    }
    return inFlight;
  }

  private dedupedGenerateCombined(userId: string): Promise<void> {
    const filmKey = `${userId}:film`;
    const bookKey = `${userId}:book`;
    const existing = this.inFlight.get(filmKey) ?? this.inFlight.get(bookKey);
    if (existing) return existing;
    const inFlight = this.generateCombined(userId)
      .catch((e) => this.logger.error(`combined generate failed for userId=${userId}`, e as Error))
      .finally(() => {
        this.inFlight.delete(filmKey);
        this.inFlight.delete(bookKey);
      });
    this.inFlight.set(filmKey, inFlight);
    this.inFlight.set(bookKey, inFlight);
    return inFlight;
  }

  private async generateBatch(userId: string, mediaType: MediaKind): Promise<void> {
    const ctx = await this.buildContext(userId, mediaType);
    if (!ctx) return;
    const existingIds = await this.repo.getExistingExternalIds(userId, mediaType);
    const exclude = await this.repo.getAllTitles(userId, mediaType);

    // One LLM call per top-up. If it comes back light, the prefetch threshold simply
    // fires again on the next swipe rather than chaining a second (slow, costly) call.
    const enriched = await this.generateAndEnrich(mediaType, ctx, exclude, existingIds);
    await this.repo.createMany(userId, mediaType, enriched);
  }

  /** Cold start: both queues from one LLM call. */
  private async generateCombined(userId: string): Promise<void> {
    const results = await this.testResultRepository.getTestResults(userId);
    const completed = this.resolveTargetTests(results);
    if (completed.length < TEST_ORDER.length) return;
    const profileBlock = buildProfileBlock(this.orderResults(completed, results));

    const { films, books } = await this.ai.recommendCombined({ profileBlock, count: BATCH_REQUEST });
    const [ef, eb] = await Promise.all([
      this.catalog.enrichMany('film', films),
      this.catalog.enrichMany('book', books),
    ]);
    await Promise.all([
      this.repo.createMany(userId, 'film', this.dedupeByExternalId(ef)),
      this.repo.createMany(userId, 'book', this.dedupeByExternalId(eb)),
    ]);
  }

  private async generateAndEnrich(
    mediaType: MediaKind,
    ctx: GenContext,
    exclude: string[],
    excludeIds: Set<string>,
  ): Promise<EnrichedItem[]> {
    const raw = await this.ai.recommend({
      mediaType,
      profileBlock: ctx.profileBlock,
      liked: ctx.liked,
      disliked: ctx.disliked,
      exclude,
      count: BATCH_REQUEST,
    });
    const enriched = await this.catalog.enrichMany(mediaType, raw);
    return enriched.filter((e) => !excludeIds.has(e.externalId));
  }

  private async buildContext(userId: string, mediaType: MediaKind): Promise<GenContext | null> {
    const results = await this.testResultRepository.getTestResults(userId);
    const completed = this.resolveTargetTests(results);
    if (completed.length < TEST_ORDER.length) return null;

    const ratedCount = await this.repo.countRated(userId, mediaType);
    const profileBlock =
      ratedCount < DROP_PROFILE_AFTER ? buildProfileBlock(this.orderResults(completed, results)) : undefined;
    const { liked, disliked } = await this.repo.getRatedTitles(userId, mediaType);
    return { profileBlock, liked, disliked };
  }

  // ---- helpers (mirror PortraitService' test-set resolution) ---------------

  private resolveTargetTests(results: { testType: string; result: unknown }[]): string[] {
    const iqResult = results.find((r) => r.testType === 'iq');
    const iqInvalid = (iqResult?.result as { reliability?: string } | undefined)?.reliability === 'invalid';
    const completed = new Set(results.filter((r) => !(r.testType === 'iq' && iqInvalid)).map((r) => r.testType));
    return TEST_ORDER.filter((t) => completed.has(t));
  }

  private orderResults(targetTests: string[], results: { testType: string; result: unknown }[]) {
    return targetTests
      .map((type) => results.find((r) => r.testType === type))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({ testType: r.testType, result: r.result as any }));
  }

  private dedupeByExternalId(items: EnrichedItem[]): EnrichedItem[] {
    const seen = new Set<string>();
    return items.filter((it) => {
      if (seen.has(it.externalId)) return false;
      seen.add(it.externalId);
      return true;
    });
  }
}
