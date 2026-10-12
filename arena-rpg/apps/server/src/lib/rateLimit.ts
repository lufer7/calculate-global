import { createHash, randomBytes } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

/**
 * Abuse protection without storing IPs:
 * - the IP is hashed with a random salt that lives only in RAM and rotates every window,
 * - counters vanish when the window ends,
 * so yesterday's (or even the previous minute's) buckets cannot be mapped back to an IP.
 */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  clientKey: (c: Parameters<MiddlewareHandler>[0]) => string;
  now?: () => number;
}): MiddlewareHandler {
  const now = opts.now ?? Date.now;
  let windowStart = now();
  let salt = randomBytes(16);
  let counts = new Map<string, number>();

  return async (c, next) => {
    if (now() - windowStart >= opts.windowMs) {
      windowStart = now();
      salt = randomBytes(16);
      counts = new Map();
    }
    const bucket = createHash('sha256').update(salt).update(opts.clientKey(c)).digest('base64url').slice(0, 16);
    const n = (counts.get(bucket) ?? 0) + 1;
    counts.set(bucket, n);
    if (n > opts.max) return c.json({ error: 'rate_limited' }, 429);
    await next();
  };
}
