import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MediaType } from '../../generated/prisma/enums';
import { MediaKind } from '../ai/prompts/recommendations.prompt';
import { EnrichedItem } from './catalog.service';

const toDb = (m: MediaKind): MediaType => (m === 'film' ? 'FILM' : 'BOOK');

@Injectable()
export class RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The not-yet-swiped queue, in stable display order. */
  getQueue(userId: string, mediaType: MediaKind) {
    return this.prisma.recommendationItem.findMany({
      where: { userId, mediaType: toDb(mediaType), verdict: 'PENDING' },
      orderBy: [{ createdAt: 'asc' }, { order: 'asc' }],
    });
  }

  /** Every swiped item (liked + disliked), newest swipe first — the history feed. */
  getRated(userId: string) {
    return this.prisma.recommendationItem.findMany({
      where: { userId, verdict: { in: ['LIKED', 'DISLIKED'] } },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  countPending(userId: string, mediaType: MediaKind) {
    return this.prisma.recommendationItem.count({
      where: { userId, mediaType: toDb(mediaType), verdict: 'PENDING' },
    });
  }

  countRated(userId: string, mediaType: MediaKind) {
    return this.prisma.recommendationItem.count({
      where: { userId, mediaType: toDb(mediaType), verdict: { in: ['LIKED', 'DISLIKED'] } },
    });
  }

  countAll(userId: string) {
    return this.prisma.recommendationItem.count({ where: { userId } });
  }

  async getRatedTitles(userId: string, mediaType: MediaKind): Promise<{ liked: string[]; disliked: string[] }> {
    const rows = await this.prisma.recommendationItem.findMany({
      where: { userId, mediaType: toDb(mediaType), verdict: { in: ['LIKED', 'DISLIKED'] } },
      select: { title: true, verdict: true },
    });
    return {
      liked: rows.filter((r) => r.verdict === 'LIKED').map((r) => r.title),
      disliked: rows.filter((r) => r.verdict === 'DISLIKED').map((r) => r.title),
    };
  }

  /** Every title the user has already been shown (any verdict) — the exclude list. */
  async getAllTitles(userId: string, mediaType: MediaKind): Promise<string[]> {
    const rows = await this.prisma.recommendationItem.findMany({
      where: { userId, mediaType: toDb(mediaType) },
      select: { title: true },
    });
    return rows.map((r) => r.title);
  }

  async getExistingExternalIds(userId: string, mediaType: MediaKind): Promise<Set<string>> {
    const rows = await this.prisma.recommendationItem.findMany({
      where: { userId, mediaType: toDb(mediaType) },
      select: { externalId: true },
    });
    return new Set(rows.map((r) => r.externalId));
  }

  async createMany(userId: string, mediaType: MediaKind, items: EnrichedItem[]): Promise<void> {
    if (!items.length) return;
    await this.prisma.recommendationItem.createMany({
      data: items.map((it, i) => ({
        userId,
        mediaType: toDb(mediaType),
        externalId: it.externalId,
        title: it.title,
        posterUrl: it.posterUrl,
        synopsis: it.synopsis ?? '',
        year: it.year ?? null,
        author: it.author ?? null,
        extra: it.extra ?? undefined,
        order: i,
      })),
    });
  }

  /** Re-rate an already-swiped item (owner-scoped, any current verdict). Drives the
   *  like toggle in the profile's Liked / History views. */
  async rate(userId: string, itemId: string, verdict: 'LIKED' | 'DISLIKED') {
    const updated = await this.prisma.recommendationItem.updateMany({
      where: { id: itemId, userId, verdict: { in: ['LIKED', 'DISLIKED'] } },
      data: { verdict },
    });
    if (updated.count === 0) return null;
    return this.prisma.recommendationItem.findUnique({ where: { id: itemId } });
  }

  /** Records a swipe. Scoped to PENDING + owner, so a double-swipe is a no-op. */
  async setVerdict(userId: string, itemId: string, verdict: 'LIKED' | 'DISLIKED') {
    const updated = await this.prisma.recommendationItem.updateMany({
      where: { id: itemId, userId, verdict: 'PENDING' },
      data: { verdict },
    });
    if (updated.count === 0) return null;
    return this.prisma.recommendationItem.findUnique({ where: { id: itemId } });
  }

  async deleteByType(userId: string, mediaType: MediaKind): Promise<void> {
    await this.prisma.recommendationItem.deleteMany({ where: { userId, mediaType: toDb(mediaType) } });
  }
}
