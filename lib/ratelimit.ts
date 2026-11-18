import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { aiUsage } from "@/db/schema";
import { getDb } from "@/lib/db";

const mem: { ip: string; tip: string; t: number }[] = [];

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.RATE_LIMIT_SALT ?? "prgturk"}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * IP başına saatlik ve global günlük limit. true = izin verildi (ve sayaca yazıldı).
 * Limitler: AI_HOURLY_LIMIT (IP/saat, varsayılan 5), AI_DAILY_LIMIT (global/gün, varsayılan 200).
 */
export async function takeAiQuota(req: Request, tip: string): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  const perHour = Number(process.env.AI_HOURLY_LIMIT ?? 5);
  const perDay = Number(process.env.AI_DAILY_LIMIT ?? 200);
  const ipHash = hashIp(clientIp(req));
  const hourAgo = new Date(Date.now() - 3_600_000);
  const dayAgo = new Date(Date.now() - 86_400_000);
  const db = getDb();
  if (db) {
    const [[mine], [all]] = await Promise.all([
      db.select({ n: count() }).from(aiUsage).where(and(eq(aiUsage.ipHash, ipHash), eq(aiUsage.tip, tip), gte(aiUsage.tarih, hourAgo))),
      db.select({ n: count() }).from(aiUsage).where(gte(aiUsage.tarih, dayAgo)),
    ]);
    if ((mine?.n ?? 0) >= perHour) return { ok: false, mesaj: `saatlik limit doldu (${perHour}). biraz sonra tekrar dene.` };
    if ((all?.n ?? 0) >= perDay) return { ok: false, mesaj: "günlük yapay zekâ kotası doldu. yarın tekrar dene." };
    await db.insert(aiUsage).values({ ipHash, tip });
    return { ok: true };
  }
  const now = Date.now();
  while (mem.length && now - mem[0]!.t > 86_400_000) mem.shift();
  if (mem.filter((m) => m.ip === ipHash && m.tip === tip && now - m.t < 3_600_000).length >= perHour) return { ok: false, mesaj: `saatlik limit doldu (${perHour}).` };
  if (mem.length >= perDay) return { ok: false, mesaj: "günlük yapay zekâ kotası doldu." };
  mem.push({ ip: ipHash, tip, t: now });
  return { ok: true };
}
