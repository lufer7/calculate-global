import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, structuredCall } from "@/lib/ai/client";
import { getTickerData, FORMAT_ETIKET } from "@/lib/cpm/queries";
import { buildFacts, COMMENT_SYSTEM, commentSchema, sanitizeComment, type BenchmarkBand } from "@/lib/report/comment";
import { summarySchema } from "@/lib/report/summary-schema";
import { takeAiQuota } from "@/lib/ratelimit";

export const maxDuration = 120;

/**
 * §M7.4: sunucuya yalnızca tarayıcıda hesaplanmış TOPLU özet gelir (ham satır yok).
 * Model yalnızca yorum yazar; çıktıdaki her sayı olgularla karşılaştırılır.
 * İstek gövdesi saklanmaz, loglanmaz.
 */
export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ hata: "Yapay zekâ servisi yapılandırılmadı (ANTHROPIC_API_KEY)." }, { status: 503 });
  const parsed = z.object({ ozet: summarySchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hata: "özet doğrulanamadı" }, { status: 400 });
  const quota = await takeAiQuota(req, "report");
  if (!quota.ok) return NextResponse.json({ hata: quota.mesaj }, { status: 429 });

  const ticker = await getTickerData();
  const bench: BenchmarkBand[] =
    ticker.durum === "ok"
      ? ticker.hucreler
          .filter((h) => h.durum === "ok")
          .map((h) => ({ format: FORMAT_ETIKET[h.format as keyof typeof FORMAT_ETIKET] ?? h.format, min: h.tlMin!, max: h.tlMax!, kaynak: h.bantlar.map((b) => b.kaynakAdi).join(", ") }))
      : [];
  const facts = buildFacts(parsed.data.ozet, bench);
  let last = "yorum üretilemedi";
  for (let i = 0; i < 2; i++) {
    const r = await structuredCall(commentSchema, COMMENT_SYSTEM, `<olgular>\n${facts}\n</olgular>`, { effort: "medium" });
    if (!r.ok) {
      last = r.mesaj;
      if (r.neden !== "gecersiz") break;
      continue;
    }
    const { yorum, atilan } = sanitizeComment(r.data, facts);
    // Çok fazla madde atıldıysa bir kez daha dene
    if (atilan > 3 && i === 0) continue;
    console.info(`[report] yorum ok, atılan madde=${atilan}`);
    return NextResponse.json({ yorum, atilan });
  }
  return NextResponse.json({ hata: `Yorum üretilemedi: ${last}.` }, { status: 502 });
}
