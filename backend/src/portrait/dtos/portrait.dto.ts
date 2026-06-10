export type PortraitStatus = 'locked' | 'generating' | 'ready' | 'error';

/**
 * Response for GET /portrait.
 * - `locked`: not enough tests done yet — `completed`/`required` drive the progress UI.
 * - `generating`: a first-ever build is in flight and there's no cached portrait to
 *   show yet. `completedTests` lists the tests the user has finished so the client can
 *   already render the constellation with a loading ring on each one.
 * - `ready`: `content` (markdown) + `basedOn` (which tests it was synthesized from) +
 *   `completedTests` (every test the user has finished — equals `basedOn` unless a
 *   newer test isn't reflected yet) + `updatedAt` (version key the client uses to
 *   animate a swap) + `refreshing` (a newer generation is in flight; the client keeps
 *   showing this cached portrait, polls, and swaps in the fresh one once it lands).
 * - `error`: generation failed; the client can retry by re-fetching.
 */
export class PortraitDto {
  readonly status: PortraitStatus;
  readonly completed?: number;
  readonly required?: number;
  readonly content?: string;
  readonly basedOn?: string[];
  readonly completedTests?: string[];
  readonly updatedAt?: string;
  readonly refreshing?: boolean;

  private constructor(init: Partial<PortraitDto> & { status: PortraitStatus }) {
    Object.assign(this, init);
  }

  static locked(completed: number, required: number): PortraitDto {
    return new PortraitDto({ status: 'locked', completed, required });
  }

  static generating(completedTests: string[] = []): PortraitDto {
    return new PortraitDto({ status: 'generating', completedTests });
  }

  static ready(
    content: string,
    basedOn: string[],
    opts: { updatedAt?: Date; refreshing?: boolean; completedTests?: string[] } = {},
  ): PortraitDto {
    return new PortraitDto({
      status: 'ready',
      content,
      basedOn,
      completedTests: opts.completedTests ?? basedOn,
      updatedAt: opts.updatedAt?.toISOString(),
      refreshing: opts.refreshing ?? false,
    });
  }

  static error(): PortraitDto {
    return new PortraitDto({ status: 'error' });
  }
}
