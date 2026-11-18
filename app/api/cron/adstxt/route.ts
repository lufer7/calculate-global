import { NextResponse } from "next/server";
import { asc, sql } from "drizzle-orm";
import { domains } from "@/db/schema";
import { getDb } from "@/lib/db";
import { crawlAndStore } from "@/lib/adstxt/crawl";
import { cronAuthorized } from "@/lib/cron";

export const maxDuration = 300;

/**
 * Günlük ads.txt taraması: en uzun süredir taranmamış N domain, sırayla ve aralıklı.
 * Host başına günde bir istek kuralı crawl_log ile ayrıca zorlanır.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ hata: "DATABASE_URL yok" }, { status: 503 });
  const limit = Number(process.env.ADSTXT_CRON_LIMIT ?? 40);
  const rows = await db
    .select({ domain: domains.domain })
    .from(domains)
    .orderBy(
      asc(sql`(select max(c.tarih) from crawl_log c where c.host = ${domains.domain} and c.tip = 'adstxt') nulls first`),
    )
    .limit(limit);
  const out: Record<string, string> = {};
  const started = Date.now();
  for (const { domain } of rows) {
    if (Date.now() - started > 270_000) break;
    try {
      out[domain] = (await crawlAndStore(domain, { maxSsp: 30 })).durum;
    } catch (e) {
      out[domain] = `hata: ${(e as Error).message.slice(0, 80)}`;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return NextResponse.json({ taranan: Object.keys(out).length, sonuc: out });
}
