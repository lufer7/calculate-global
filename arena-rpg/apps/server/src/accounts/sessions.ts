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

/** Looks up a Bearer token (stored only as a SHA-256 hash) and refreshes its idle timer. */
export function resolveSession(db: Db, kind: SessionKind, authorization: string | undefined, now: number) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  const hash = sha256(token);
  const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND kind = ?').get(hash, kind) as
    | { subject_id: string; expires_at: number; last_seen_at: number }
    | undefined;
  if (!row || row.expires_at <= now || now - row.last_seen_at > SESSION_POLICY[kind].idleMs) {
    if (row) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
    return null;
  }
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(now, hash);
  return { subjectId: row.subject_id, tokenHash: hash };
}

export function requireSession(db: Db, kind: SessionKind, now: () => number): MiddlewareHandler<{ Variables: { subjectId: string; tokenHash: string } }> {
  return async (c, next) => {
    const s = resolveSession(db, kind, c.req.header('authorization'), now());
    if (!s) return c.json({ error: 'unauthorized' }, 401);
    c.set('subjectId', s.subjectId);
    c.set('tokenHash', s.tokenHash);
    await next();
  };
}

export function endSession(db: Db, tokenHash: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}
