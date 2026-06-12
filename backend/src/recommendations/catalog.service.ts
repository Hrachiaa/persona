import { Injectable, Logger } from '@nestjs/common';
import { MediaKind, RawRecommendation } from '../ai/prompts/recommendations.prompt';

/** A raw recommendation resolved against a real catalog entry (poster + metadata). */
export interface EnrichedItem {
  externalId: string; // e.g. "tmdb:603" / "gbooks:zyTCAlFPjgYC"
  title: string;
  posterUrl: string;
  synopsis: string;
  year?: number;
  author?: string;
  extra?: Record<string, any>;
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const FETCH_TIMEOUT_MS = 8000;

/**
 * Turns the model's raw picks (title + year/author) into real, displayable cards
 * by looking them up in public catalogs — TMDB for films, Google Books (with an
 * Open Library cover fallback) for books. An item that can't be matched OR has no
 * cover art is dropped (returns null), so the UI never shows a posterless card.
 *
 * Lookups are memoized in-process keyed by normalized title+year/author, so a
 * title that recurs across users/batches is fetched once.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly cache = new Map<string, EnrichedItem | null>();

  /** Enriches a batch in parallel; drops misses and de-dupes by catalog id. */
  async enrichMany(mediaType: MediaKind, recs: RawRecommendation[]): Promise<EnrichedItem[]> {
    const settled = await Promise.all(recs.map((r) => this.enrich(mediaType, r)));
    const seen = new Set<string>();
    const out: EnrichedItem[] = [];
    for (const item of settled) {
      if (!item || seen.has(item.externalId)) continue;
      seen.add(item.externalId);
      out.push(item);
    }
    return out;
  }

  async enrich(mediaType: MediaKind, rec: RawRecommendation): Promise<EnrichedItem | null> {
    const key = this.cacheKey(mediaType, rec);
    if (this.cache.has(key)) return this.cache.get(key)!;
    let result: EnrichedItem | null = null;
    try {
      result = mediaType === 'film' ? await this.enrichFilm(rec) : await this.enrichBook(rec);
    } catch (error) {
      this.logger.warn(`Catalog lookup failed for ${mediaType} "${rec.title}": ${(error as Error).message}`);
    }
    this.cache.set(key, result);
    return result;
  }

  private async enrichFilm(rec: RawRecommendation): Promise<EnrichedItem | null> {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      this.logger.warn('TMDB_API_KEY is not configured — films cannot be enriched');
      return null;
    }
    const params = new URLSearchParams({
      query: rec.title,
      include_adult: 'false',
      language: 'en-US',
      api_key: apiKey,
    });
    if (rec.year) params.set('year', String(rec.year));

    const data = await this.fetchJson(`https://api.themoviedb.org/3/search/movie?${params}`);
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    // results are popularity-sorted; take the most popular one that has a poster.
    const hit = results.find((r) => r.poster_path);
    if (!hit) return null;

    return {
      externalId: `tmdb:${hit.id}`,
      title: hit.title || rec.title,
      posterUrl: `${TMDB_IMG}${hit.poster_path}`,
      synopsis: hit.overview || '',
      year: hit.release_date ? Number(hit.release_date.slice(0, 4)) : rec.year,
      extra: {
        rating: hit.vote_average,
        url: `https://www.themoviedb.org/movie/${hit.id}`,
      },
    };
  }

  private async enrichBook(rec: RawRecommendation): Promise<EnrichedItem | null> {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const q = `intitle:${rec.title}${rec.author ? `+inauthor:${rec.author}` : ''}`;
    const params = new URLSearchParams({ q, maxResults: '5', printType: 'books' });
    if (apiKey) params.set('key', apiKey);

    const data = await this.fetchJson(`https://www.googleapis.com/books/v1/volumes?${params}`);
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    // prefer a volume that already carries a cover; otherwise the first match.
    const vol = items.find((v) => v.volumeInfo?.imageLinks) ?? items[0];
    if (!vol) return null;
    const info = vol.volumeInfo ?? {};

    let posterUrl = (info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '').replace(/^http:/, 'https:');
    if (!posterUrl) posterUrl = await this.openLibraryCover(rec.title, rec.author);
    if (!posterUrl) return null;

    return {
      externalId: `gbooks:${vol.id}`,
      title: info.title || rec.title,
      posterUrl,
      synopsis: info.description || '',
      author: Array.isArray(info.authors) ? info.authors.join(', ') : rec.author,
      extra: { rating: info.averageRating, url: info.infoLink },
    };
  }

  /** Open Library cover fallback when Google Books has no image for a book. */
  private async openLibraryCover(title: string, author?: string): Promise<string> {
    const params = new URLSearchParams({ title, limit: '1', fields: 'cover_i' });
    if (author) params.set('author', author);
    const data = await this.fetchJson(`https://openlibrary.org/search.json?${params}`);
    const coverId = data?.docs?.[0]?.cover_i;
    return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '';
  }

  private async fetchJson(url: string): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private cacheKey(mediaType: MediaKind, rec: RawRecommendation): string {
    const norm = rec.title.trim().toLowerCase();
    const qualifier = mediaType === 'film' ? rec.year ?? '' : (rec.author ?? '').trim().toLowerCase();
    return `${mediaType}:${norm}:${qualifier}`;
  }
}
