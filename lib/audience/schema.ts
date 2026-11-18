/**
 * LLM çıktı şeması ve deterministik çözümleme (§M6).
 * Model YALNIZCA: keyword'ler, strateji metni, gruplar, listeden segment kimliği ve tek cümle seçim nedeni döndürür.
 * Segment adı, sağlayıcı, CPM, reach, Audience Id her zaman yüklenen listeden kopyalanır — model sayı üretmez.
 */
import { z } from "zod";
import type { Dsp, Segment } from "./segments";

const secim = z.object({
  grup: z.string().min(1).max(60),
  segmentId: z.string().regex(/^s\d+$/),
  secimNedeni: z.string().min(5).max(220),
});

export const audienceLlmSchema = z.object({
  keywords: z.array(z.string().min(1).max(80)).max(300),
  strateji: z.string().min(10).max(3000),
  orAndNotu: z.string().min(10).max(600),
  adform: z.array(secim).max(60),
  amazon: z.array(secim).max(60),
  dv360: z.array(secim).max(60),
  retargeting: z
    .array(z.object({ kitle: z.string().min(3).max(120), kaynak: z.enum(["site pixel", "app event"]), tanim: z.string().min(5).max(220) }))
    .max(20),
  prospectingHaricTut: z.array(z.string().min(3).max(120)).max(20),
});
export type AudienceLlm = z.infer<typeof audienceLlmSchema>;

export type CiktiSatiri = {
  grup: string;
  kitleAdi: string;
  saglayici: string;
  cpmTl: number | null;
  reach: string | null;
  audienceId: string | null;
  secimNedeni: string;
};

export type AudienceResult = {
  keywords: string[];
  strateji: string;
  orAndNotu: string;
  sheets: Partial<Record<Dsp, CiktiSatiri[]>>;
  retargeting: AudienceLlm["retargeting"];
  prospectingHaricTut: string[];
  ortalamaDataCpm: Partial<Record<Dsp, number | null>>;
};

/** Tek cümle kuralı: ilk cümleyi al, sondaki noktayı koru. */
export function tekCumle(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1]! : t;
}

export class UydurmaSegmentHatasi extends Error {}

/**
 * Model çıktısını listeyle çözümler. Listede olmayan bir kimlik varsa HATA fırlatır
 * (yeniden denemeyi tetikler) — uydurma segment Excel'e asla girmez.
 */
export function resolveAudience(llm: AudienceLlm, lists: Partial<Record<Dsp, Segment[]>>, dspler: Dsp[]): AudienceResult {
  const sheets: AudienceResult["sheets"] = {};
  const ortalama: AudienceResult["ortalamaDataCpm"] = {};
  for (const dsp of dspler) {
    const list = lists[dsp] ?? [];
    const byId = new Map(list.map((s) => [s.id, s]));
    const seen = new Set<string>();
    const rows: CiktiSatiri[] = [];
    for (const s of llm[dsp]) {
      const seg = byId.get(s.segmentId);
      if (!seg) throw new UydurmaSegmentHatasi(`${dsp}: listede olmayan segment kimliği ${s.segmentId}`);
      if (seen.has(seg.id)) continue;
      seen.add(seg.id);
      rows.push({
        grup: s.grup.trim(),
        kitleAdi: seg.ad,
        saglayici: seg.saglayici ?? "",
        cpmTl: seg.cpmTl,
        reach: seg.reach,
        audienceId: dsp === "amazon" ? seg.audienceId : null,
        secimNedeni: tekCumle(s.secimNedeni),
      });
    }
    // grupları bir arada tut (ilk görülme sırasıyla)
    const order = [...new Set(rows.map((r) => r.grup))];
    rows.sort((a, b) => order.indexOf(a.grup) - order.indexOf(b.grup));
    sheets[dsp] = rows;
    const cpms = rows.map((r) => r.cpmTl).filter((x): x is number => x !== null);
    ortalama[dsp] = cpms.length ? cpms.reduce((a, b) => a + b, 0) / cpms.length : null;
  }
  return {
    keywords: [...new Set(llm.keywords.map((k) => k.trim()).filter(Boolean))],
    strateji: llm.strateji.trim(),
    orAndNotu: llm.orAndNotu.trim(),
    sheets,
    retargeting: llm.retargeting,
    prospectingHaricTut: llm.prospectingHaricTut,
    ortalamaDataCpm: ortalama,
  };
}
