export type PortraitStatus = 'locked' | 'ready' | 'error';

/**
 * Response for GET /portrait.
 * - `locked`: not enough tests done yet — `completed`/`required` drive the progress UI.
 * - `ready`: `content` (markdown) + `basedOn` (which tests it was synthesized from).
 * - `error`: generation failed; the client can retry by re-fetching.
 */
export class PortraitDto {
  readonly status: PortraitStatus;
  readonly completed?: number;
  readonly required?: number;
  readonly content?: string;
  readonly basedOn?: string[];

  private constructor(init: Partial<PortraitDto> & { status: PortraitStatus }) {
    Object.assign(this, init);
  }

  static locked(completed: number, required: number): PortraitDto {
    return new PortraitDto({ status: 'locked', completed, required });
  }

  static ready(content: string, basedOn: string[]): PortraitDto {
    return new PortraitDto({ status: 'ready', content, basedOn });
  }

  static error(): PortraitDto {
    return new PortraitDto({ status: 'error' });
  }
}
