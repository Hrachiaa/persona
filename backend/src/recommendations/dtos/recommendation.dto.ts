import { MediaKind } from '../../ai/prompts/recommendations.prompt';
import { MediaType, RecommendationVerdict } from '../../../generated/prisma/enums';

export type RecommendationStatus = 'locked' | 'generating' | 'ready';

/** A single swipeable card as sent to the client. */
export class RecommendationItemDto {
  readonly id: string;
  readonly externalId: string; // catalog id, e.g. "gbooks:<volumeId>" — used for the book preview
  readonly mediaType: MediaKind;
  readonly title: string;
  readonly posterUrl: string;
  readonly synopsis: string;
  readonly year?: number;
  readonly author?: string;
  readonly extra?: Record<string, any>;
}

// Structural shape of a persisted row — avoids coupling the DTO to the full
// Prisma model type while keeping the mapper type-checked.
interface RecommendationRow {
  id: string;
  externalId: string;
  mediaType: MediaType;
  title: string;
  posterUrl: string;
  synopsis: string;
  year: number | null;
  author: string | null;
  extra: unknown;
}

/** A previously swiped card, as shown in the profile's Liked / History views. */
export class RecommendationHistoryItemDto extends RecommendationItemDto {
  readonly verdict: 'liked' | 'disliked';
  readonly swipedAt: Date;
}

export function toHistoryItemDto(
  row: RecommendationRow & { verdict: RecommendationVerdict; updatedAt: Date },
): RecommendationHistoryItemDto {
  return {
    ...toItemDto(row),
    verdict: row.verdict === 'LIKED' ? 'liked' : 'disliked',
    swipedAt: row.updatedAt,
  };
}

export class RecommendationHistoryDto {
  readonly items: RecommendationHistoryItemDto[];
}

export function toItemDto(row: RecommendationRow): RecommendationItemDto {
  return {
    id: row.id,
    externalId: row.externalId,
    mediaType: row.mediaType === 'FILM' ? 'film' : 'book',
    title: row.title,
    posterUrl: row.posterUrl,
    synopsis: row.synopsis,
    year: row.year ?? undefined,
    author: row.author ?? undefined,
    extra: (row.extra as Record<string, any>) ?? undefined,
  };
}

/**
 * Response for GET /recommendations?type=…
 * - `locked`: not all tests done yet — `completed`/`required` drive the unlock UI.
 * - `generating`: the queue is empty and a batch is in flight; the client polls.
 * - `ready`: `items` is the not-yet-swiped queue; `generating` flags that more are
 *   on the way (the client keeps swiping and merges them in when they land).
 */
export class RecommendationListDto {
  readonly status: RecommendationStatus;
  readonly mediaType: MediaKind;
  readonly items?: RecommendationItemDto[];
  readonly generating?: boolean;
  readonly completed?: number;
  readonly required?: number;

  private constructor(
    init: Partial<RecommendationListDto> & { status: RecommendationStatus; mediaType: MediaKind },
  ) {
    Object.assign(this, init);
  }

  static locked(mediaType: MediaKind, completed: number, required: number): RecommendationListDto {
    return new RecommendationListDto({ status: 'locked', mediaType, completed, required });
  }

  static generating(mediaType: MediaKind): RecommendationListDto {
    return new RecommendationListDto({ status: 'generating', mediaType, items: [], generating: true });
  }

  static ready(mediaType: MediaKind, items: RecommendationItemDto[], generating: boolean): RecommendationListDto {
    return new RecommendationListDto({ status: 'ready', mediaType, items, generating });
  }
}
