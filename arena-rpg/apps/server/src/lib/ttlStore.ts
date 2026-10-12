/**
 * Ephemeral key/value store with mandatory TTL. Nothing here survives a restart,
 * and nothing lives longer than its TTL. In production swap for Redis with
 * `SET key value EX ttl` and persistence (RDB/AOF) DISABLED.
 */
export class TtlStore<V> {
  private readonly map = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= this.now()) {
      this.map.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    this.map.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  /** Read-and-delete (used for one-time transfer blobs). */
  take(key: string): V | undefined {
    const v = this.get(key);
    this.map.delete(key);
    return v;
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  values(): V[] {
    this.sweep();
    return [...this.map.values()].map((e) => e.value);
  }

  get size(): number {
    return this.map.size;
  }

  sweep(): void {
    const now = this.now();
    for (const [k, e] of this.map) if (e.expiresAt <= now) this.map.delete(k);
  }
}
