/**
 * In-process "single flight": dedupes concurrent async work under a key so an
 * expensive operation (an LLM generation) runs once while every caller awaits the
 * same promise. The key is cleared when the work settles.
 *
 * SCALING CAVEAT: this state lives in ONE Node process. With multiple backend
 * instances behind a load balancer, each keeps its own registry, so the same key
 * can still run once per instance. Making dedup cluster-wide needs shared state
 * (e.g. a Redis lock). This class is the single seam where that swap would happen —
 * the same limitation applies to the in-memory ThrottlerModule store.
 */
export class SingleFlight {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /** Whether work is currently running under this key. */
  has(key: string): boolean {
    return this.inFlight.has(key);
  }

  /** Run `fn` under `key`, or return the in-flight promise if one already exists. */
  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const started = fn().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, started);
    return started;
  }

  /**
   * Run `fn` held under several keys at once (e.g. a combined cold-start that fills
   * more than one queue). Returns any in-flight promise if any key is already busy.
   */
  runShared<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
    for (const key of keys) {
      const existing = this.inFlight.get(key) as Promise<T> | undefined;
      if (existing) return existing;
    }
    const started = fn().finally(() => {
      for (const key of keys) this.inFlight.delete(key);
    });
    for (const key of keys) this.inFlight.set(key, started);
    return started;
  }
}
