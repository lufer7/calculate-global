import type { MiddlewareHandler } from 'hono';
import type { Db } from '../db/database';
import { accountById, effectiveStatus, revokeSessions, touchActivity } from './repo';
import { resolveSession } from './sessions';

/** Valid player session on an existing, non-banned account. */
export function playerGuard(db: Db, now: () => number): MiddlewareHandler<{ Variables: { subjectId: string; tokenHash: string } }> {
  return async (c, next) => {
    const s = resolveSession(db, 'player', c.req.header('authorization'), now());
    const acc = s && accountById(db, s.subjectId);
    if (!s || !acc) return c.json({ error: 'unauthorized' }, 401);
    if (effectiveStatus(db, acc, now()) === 'banned') {
      revokeSessions(db, acc.id);
      return c.json({ error: 'banned', reason: acc.ban_reason, until: acc.banned_until }, 403);
    }
    touchActivity(db, acc.id, now());
    c.set('subjectId', s.subjectId);
    c.set('tokenHash', s.tokenHash);
    await next();
  };
}
