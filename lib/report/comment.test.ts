import { describe, expect, it } from "vitest";
import { buildFacts, COMMENT_SYSTEM, isAllowed, numbersIn, sanitizeComment, type Comment } from "./comment";
import { normalizeRows, summarize } from "./metrics";

const rows = normalizeRows(
  [
    ["2026-11-02", "Site A", "100000", "150", "2000", "60000", "90000", "10", "3"],
    ["2026-11-10", "Site B", "50000", "200", "1500", "", "", "20", "12"],
    ["2026-11-10", "Site C", "50000", "20", "1500", "", "", "2", "4"],
    ["2026-11-10", "Site D", "50000", "10", "1500", "", "", "1", "1"],
  ],
  { tarih: 0, boyut: 1, impression: 2, klik: 3, harcama: 4, gorulebilir: 5, olculen: 6, donusum: 7, frekans: 8 },
);
const s = summarize(rows.rows, ["harcama"], { butce: 30000, baslangic: "2026-11-01", bitis: "2026-11-30" });

describe("buildFacts", () => {
  it("olgular, benchmark yok uyarısı, düzeltme notu", () => {
    const f = buildFacts(s, []);
    expect(f).toContain("Impression: 250.000");
    expect(f).toContain("Harcama: ₺6.500,00");
    expect(f).toContain("Benchmark: bu rapor için yayınlanmış benchmark yok");
    expect(f).toContain("Adform 10^15 düzeltmesi");
    expect(f).toContain("Haftalık:");
    expect(f).toContain("En iyi satırlar:");
    expect(f).toContain("Pacing:");
    expect(f).toContain("Frekans dağılımı:");
  });
  it("benchmark bandı ve boş özet", () => {
    expect(buildFacts(s, [{ format: "banner", min: 10, max: 20, kaynak: "X" }])).toContain("banner ₺10,00–₺20,00 (X)");
    const empty = summarize([], [], { butce: null, baslangic: null, bitis: null });
    const f = buildFacts(empty, []);
    expect(f).toContain("Dönem: ? – ?");
    expect(f).toContain("CPM: yok");
    expect(f).not.toContain("Pacing");
  });
  it("viewability paydası impression notu; kırılımda boş liste", () => {
    const s2 = summarize(
      normalizeRows([["1", "A", "100", "1"], ["1", "B", "100", "1"]], { tarih: 0, boyut: 1, impression: 2, gorulebilir: 3 }).rows,
      [],
      { butce: null, baslangic: null, bitis: null },
    );
    const f = buildFacts(s2, []);
    expect(f).toContain("payda: toplam impression");
    expect(f).toContain("En iyi satırlar: yok");
  });
  it("ROAS ve CTR ölçütlü kırılım", () => {
    const s3 = summarize(
      normalizeRows([["A", "1000", "10", "100", "250"], ["B", "1000", "5", "100", "50"]], { boyut: 0, impression: 1, klik: 2, harcama: 3, donusumDegeri: 4 }).rows,
      [],
      { butce: null, baslangic: null, bitis: null },
    );
    const f = buildFacts(s3, []);
    expect(f).toContain("ROAS: 1,5");
    expect(f).toContain("A (CTR %1,");
  });
  it("sistem prompt'u sayı üretmeyi yasaklar", () => expect(COMMENT_SYSTEM).toContain("Yeni sayı"));
});

describe("sayı denetimi", () => {
  it("numbersIn", () => {
    expect(numbersIn("CPM ₺26,00 oldu, CTR %0,152. 3 aksiyon.")).toEqual([26, 0.152, 3]);
  });
  it("isAllowed: tolerans ve küçük tam sayılar", () => {
    expect(isAllowed(3, [])).toBe(true);
    expect(isAllowed(26.1, [26])).toBe(true);
    expect(isAllowed(30, [26])).toBe(false);
    expect(isAllowed(0.5, [0])).toBe(false);
    expect(isAllowed(0, [0])).toBe(true);
  });
  it("uydurma sayı içeren madde atılır", () => {
    const facts = buildFacts(s, []);
    const c: Comment = {
      ozet: ["Harcama ₺6.500,00 ile plan dahilinde.", "CPM'i %73,4 düşürebiliriz."],
      iyi: ["Site B iyi gidiyor."],
      paraKacan: ["Site D 1.234 TL yaktı."],
      benchmark: [],
      aksiyonlar: ["1. Site D'yi durdur."],
      patron: [{ soru: "Neden pahalı?", cevap: "Viewability %66,7." }, { soru: "Bu ne?", cevap: "42 gün kaldı." }],
    };
    const r = sanitizeComment(c, facts);
    expect(r.yorum.ozet).toEqual(["Harcama ₺6.500,00 ile plan dahilinde."]);
    expect(r.yorum.paraKacan).toEqual([]);
    expect(r.yorum.aksiyonlar).toHaveLength(1);
    expect(r.yorum.patron).toHaveLength(1);
    expect(r.atilan).toBe(3);
  });
});
