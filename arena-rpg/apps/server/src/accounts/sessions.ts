import type { MiddlewareHandler } from 'hono';
import type { Db } from '../db/database';
import { randomToken, sha256 } from '../lib/security';

export type SessionKind = 'player' | 'admin';

export const SESSION_POLICY: Record<SessionKind, { absoluteMs: number; idleMs: number }> = {
  player: { absoluteMs: 30 * 24 * 3_600_000, idleMs: 30 * 24 * 3_600_000 },
  admin: { absoluteMs: 8 * 3_600_000, idleMs: 30 * 60_000 },
};

export function createSession(db: Db, kind: SessionKind, subjectId: string, now: number): string {
  const token = randomToken();
  db.prepare('INSERT INTO sessions (token_hash, kind, subject_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    sha256(token), kind, subjectId, now, now + SESSION_POLICY[kind].absoluteMs, now,
  );
  return token;
}

/** Bearer-token auth. Tokens are stored only as SHA-256 hashes. */
export function requireSession(db: Db, kind: SessionKind, now: () => number): MiddlewareHandler<{ Variables: { subjectId: string; tokenHash: string } }> {
  return async (c, next) => {
    const header = c.req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return c.json({ error: 'unauthorized' }, 401);
    const hash = sha256(token);
    const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND kind = ?').get(hash, kind) as
      | { subject_id: string; expires_at: number; last_seen_at: number }
      | undefined;
    const t = now();
    if (!row || row.expires_at <= t || t - row.last_seen_at > SESSION_POLICY[kind].idleMs) {
      if (row) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
      return c.json({ error: 'unauthorized' }, 401);
    }
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(t, hash);
    c.set('subjectId', row.subject_id);
    c.set('tokenHash', hash);
    await next();
  };
}

export function endSession(db: Db, tokenHash: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}
