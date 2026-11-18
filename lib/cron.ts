import "server-only";

/** Vercel Cron, Authorization: Bearer <CRON_SECRET> gönderir. Secret yoksa cron kapalıdır. */
export function cronAuthorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  return !!s && req.headers.get("authorization") === `Bearer ${s}`;
}
