import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, structuredCall } from "@/lib/ai/client";
import { buildUserPrompt, SYSTEM_PROMPT, type AudienceInput } from "@/lib/audience/prompt";
import { audienceLlmSchema, resolveAudience, UydurmaSegmentHatasi, type AudienceResult } from "@/lib/audience/schema";
import { takeAiQuota } from "@/lib/ratelimit";

export const maxDuration = 300;

const seg = z.object({
  id: z.string().regex(/^s\d+$/),
  ad: z.string().min(1).max(300),
  saglayici: z.string().max(200).nullable(),
  cpmTl: z.number().nonnegative().nullable(),
  reach: z.string().max(60).nullable(),
  audienceId: z.string().max(120).nullable(),
});
const dsp = z.enum(["adform", "amazon", "dv360"]);
const body = z.object({
  brief: z.string().trim().min(20, "brief en az 20 karakter olmalı").max(20_000),
  dspler: z.array(dsp).min(1).max(3),
  kampanyaTipi: z.enum(["bilinirlik", "performans", "retargeting"]),
  pazar: z.string().max(40).default("Türkiye"),
  butce: z.string().max(80).nullable().optional(),
  donem: z.string().max(80).nullable().optional(),
  segments: z.object({ adform: z.array(seg).max(5000).optional(), amazon: z.array(seg).max(5000).optional(), dv360: z.array(seg).max(5000).optional() }),
});

/**
 * §M6 / §M7 gizlilik: brief ve segment listesi istek boyunca bellekte işlenir, diske/DB'ye yazılmaz,
 * loglara yalnızca sayımlar düşer. LLM çıktısı şemadan ve "listede var mı" kontrolünden geçmezse
 * en fazla 3 kez yeniden denenir — bozuk/uydurma çıktı kullanıcıya gitmez.
 */
export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ hata: "Yapay zekâ servisi yapılandırılmadı (ANTHROPIC_API_KEY)." }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hata: parsed.error.issues.map((i) => i.message).join(" · ") }, { status: 400 });
  const quota = await takeAiQuota(req, "audience");
  if (!quota.ok) return NextResponse.json({ hata: quota.mesaj }, { status: 429 });

  const input: AudienceInput = { ...parsed.data, butce: parsed.data.butce ?? null, donem: parsed.data.donem ?? null };
  const prompt = buildUserPrompt(input);
  let last = "çıktı doğrulanamadı";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await structuredCall(audienceLlmSchema, SYSTEM_PROMPT, prompt, { effort: "medium" });
    if (!r.ok) {
      last = r.mesaj;
      if (r.neden !== "gecersiz") break;
      continue;
    }
    try {
      const result: AudienceResult = resolveAudience(r.data, input.segments, input.dspler);
      console.info(`[audience] ok deneme=${attempt} dsp=${input.dspler.join(",")} segment=${Object.values(input.segments).reduce((a, l) => a + (l?.length ?? 0), 0)}`);
      return NextResponse.json({ sonuc: result });
    } catch (e) {
      if (!(e instanceof UydurmaSegmentHatasi)) throw e;
      last = "model listede olmayan bir segment seçti; yeniden denendi";
    }
  }
  console.warn(`[audience] başarısız: ${last}`);
  return NextResponse.json({ hata: `Sonuç üretilemedi: ${last}.` }, { status: 502 });
}
