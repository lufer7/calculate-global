import { createHash } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cpmSubmissions, CPM_FORMATLAR } from "@/db/schema";
import { getDb } from "@/lib/db";
import { parseTrNumber } from "@/lib/calc/number";
import { clientIp } from "@/lib/ratelimit";
import { getCurrentUser } from "@/lib/user";

const opt = (max: number) => z.string().trim().max(max).transform((s) => s || null).nullable().optional();
const body = z.object({
  format: z.enum(CPM_FORMATLAR),
  kanal: z.enum(["desktop", "mobil", "ctv"]).nullable().optional(),
  dsp: opt(40),
  mecra: opt(80),
  satinAlma: z.enum(["open", "pmp", "pg"]).nullable().optional(),
  hedefleme: z.enum(["genis", "baglamsal", "3p-kitle", "1p-kitle", "retargeting"]).nullable().optional(),
  ay: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  cpm: z.string().max(20),
  onay: z.literal(true),
});

/**
 * Topluluk CPM girdisi (Katman B). Girdi moderasyondan geçene kadar hiçbir hesaba katılmaz.
 * Kullanıcı başına günde en fazla 20 girdi. IP yalnızca salt'lı özet olarak saklanır.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ hata: "katkı için giriş yap" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ hata: "veritabanı yapılandırılmadı" }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hata: "alanları kontrol et; onay kutusu zorunlu" }, { status: 400 });
  const cpm = parseTrNumber(parsed.data.cpm);
  if (cpm === null || cpm <= 0 || cpm > 100_000) return NextResponse.json({ hata: "CPM pozitif bir TL değeri olmalı" }, { status: 400 });
  const [today] = await db
    .select({ n: count() })
    .from(cpmSubmissions)
    .where(and(eq(cpmSubmissions.userId, user.id), gte(cpmSubmissions.createdAt, new Date(Date.now() - 86_400_000))));
  if ((today?.n ?? 0) >= 20) return NextResponse.json({ hata: "bugünlük katkı sınırı doldu (20)" }, { status: 429 });
  const ipHash = createHash("sha256").update(`${process.env.RATE_LIMIT_SALT ?? "prgturk"}:${clientIp(req)}`).digest("hex").slice(0, 32);
  const d = parsed.data;
  await db.insert(cpmSubmissions).values({
    userId: user.id,
    format: d.format,
    kanal: d.kanal ?? null,
    dsp: d.dsp ?? null,
    mecra: d.mecra ?? null,
    satinAlma: d.satinAlma ?? null,
    hedefleme: d.hedefleme ?? null,
    ay: d.ay,
    cpmTl: String(cpm),
    ipHash,
  });
  return NextResponse.json({ ok: true, mesaj: "teşekkürler. girdi moderasyondan sonra hesaba katılacak." });
}
