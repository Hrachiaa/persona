import { MediaKind } from '../../ai/prompts/recommendations.prompt';
import { MediaType } from '../../../generated/prisma/enums';

export type RecommendationStatus = 'locked' | 'generating' | 'ready';

/** A single swipeable card as sent to the client. */
export class RecommendationItemDto {
  readonly id: string;
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
  mediaType: MediaType;
  title: string;
  posterUrl: string;
  synopsis: string;
  year: number | null;
  author: string | null;
  extra: unknown;
}

export function toItemDto(row: RecommendationRow): RecommendationItemDto {
  return {
    id: row.id,
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
