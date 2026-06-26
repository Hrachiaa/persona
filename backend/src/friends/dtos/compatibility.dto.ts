export type CompatibilityStatus = 'locked' | 'generating' | 'ready' | 'error';

/**
 * Response for GET /friends/:friendId/compatibility.
 * - `locked`: at least one of the two hasn't completed every test yet —
 *   `meDone`/`friendDone`/`required` drive the "both must finish" progress UI.
 * - `generating`: both are done and a build is in flight; the client polls.
 * - `ready`: `content` (markdown analysis) + `score` (0–100 ring) + `updatedAt`.
 * - `error`: generation failed; the client can retry by re-fetching.
 */
export class CompatibilityDto {
  readonly status: CompatibilityStatus;
  readonly meDone?: number;
  readonly friendDone?: number;
  readonly required?: number;
  readonly content?: string;
  readonly score?: number;
  readonly updatedAt?: string;

  private constructor(init: Partial<CompatibilityDto> & { status: CompatibilityStatus }) {
    Object.assign(this, init);
  }

  static locked(meDone: number, friendDone: number, required: number): CompatibilityDto {
    return new CompatibilityDto({ status: 'locked', meDone, friendDone, required });
  }

  static generating(): CompatibilityDto {
    return new CompatibilityDto({ status: 'generating' });
  }

  static ready(content: string, score: number, updatedAt?: Date): CompatibilityDto {
    return new CompatibilityDto({
      status: 'ready',
      content,
      score,
      updatedAt: updatedAt?.toISOString(),
    });
  }

  static error(): CompatibilityDto {
    return new CompatibilityDto({ status: 'error' });
  }
}
