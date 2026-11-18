import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildAudienceWorkbook, buildKeywordWorkbook, headersFor, noteFor, rowFor } from "./excel";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { audienceLlmSchema, resolveAudience, tekCumle, UydurmaSegmentHatasi, type AudienceLlm } from "./schema";
import { detectColumns, toSegments } from "./segments";

const header = ["Segment ID", "Audience Name", "Data Provider", "CPM", "UID"];
const rows = [
  ["101", "Otomobil İlgilileri TR", "Digiseg TR", "12,5", "1.200.000"],
  ["102", "In-market: Cars", "Adform Audience Hub", "9", ""],
  ["103", "Otomobil İlgilileri TR", "Digiseg TR", "12,5", "dup"],
  ["", "", "", "", ""],
  ["104", "Lüks alışveriş", "Belogic TR", "abc", "50K"],
];

describe("segment listesi", () => {
  it("kolon tespiti", () => {
    expect(detectColumns(header)).toEqual({ ad: 1, saglayici: 2, cpm: 3, reach: 4, audienceId: 0 });
    expect(detectColumns(["kitle adı", "sağlayıcı"])).toEqual({ ad: 0, saglayici: 1, cpm: -1, reach: -1, audienceId: -1 });
    expect(detectColumns(["x"]).ad).toBe(-1);
    expect(detectColumns(["Kitle Adı", "Toplam UID Sayısı"]).reach).toBe(1);
  });
  it("satırlar: tekrar ve boş atlanır, TR sayı okunur, geçersiz CPM null", () => {
    const s = toSegments(rows, detectColumns(header));
    expect(s.map((x) => x.id)).toEqual(["s1", "s2", "s3"]);
    expect(s[0]).toEqual({ id: "s1", ad: "Otomobil İlgilileri TR", saglayici: "Digiseg TR", cpmTl: 12.5, reach: "1.200.000", audienceId: "101" });
    expect(s[1]!.reach).toBeNull();
    expect(s[2]!.cpmTl).toBeNull();
  });
  it("ad kolonu yoksa boş; limit; eksik kolonlar", () => {
    expect(toSegments(rows, { ad: -1, saglayici: -1, cpm: -1, reach: -1, audienceId: -1 })).toEqual([]);
    expect(toSegments(rows, detectColumns(header), 1)).toHaveLength(1);
    const s = toSegments([["Kitle A"], [" "]], { ad: 0, saglayici: -1, cpm: -1, reach: -1, audienceId: -1 });
    expect(s).toEqual([{ id: "s1", ad: "Kitle A", saglayici: null, cpmTl: null, reach: null, audienceId: null }]);
    expect(toSegments([["K", ""]], { ad: 0, saglayici: 1, cpm: 5, reach: 5, audienceId: 5 })[0]).toMatchObject({ saglayici: null, reach: null, audienceId: null });
    expect(toSegments([["K"], []], { ad: 0, saglayici: 3, cpm: -1, reach: -1, audienceId: -1 })).toHaveLength(1);
  });
});

const lists = {
  adform: toSegments(rows, detectColumns(header)),
  amazon: [{ id: "s1", ad: "Otomobil (in-market TR)", saglayici: "Amazon", cpmTl: 10, reach: "800K", audienceId: "amz-1" }],
};
const llm: AudienceLlm = {
  keywords: ["araba", " araba ", "suv", ""],
  strateji: "Otomobil ilgisi olan kitleye bağlamsal ve 3P ile git.",
  orAndNotu: "Gruplar kendi içinde OR, gruplar arası OR.",
  adform: [
    { grup: "Otomobil", segmentId: "s1", secimNedeni: "Brief otomobil alıcısını hedefliyor. İkinci cümle atılır." },
    { grup: "Lüks", segmentId: "s3", secimNedeni: "Premium segment uyumu" },
    { grup: "Otomobil", segmentId: "s2", secimNedeni: "In-market sinyal." },
    { grup: "Otomobil", segmentId: "s1", secimNedeni: "tekrar edilen seçim" },
  ],
  amazon: [{ grup: "In-market", segmentId: "s1", secimNedeni: "Türkçe etiketli in-market." }],
  dv360: [],
  retargeting: [],
  prospectingHaricTut: [],
};

describe("resolveAudience", () => {
  it("değerler listeden kopyalanır, gruplar bir arada, tek cümle, tekrar yok", () => {
    const r = resolveAudience(llm, lists, ["adform", "amazon"]);
    expect(r.keywords).toEqual(["araba", "suv"]);
    expect(r.sheets.adform!.map((x) => [x.grup, x.kitleAdi])).toEqual([
      ["Otomobil", "Otomobil İlgilileri TR"],
      ["Otomobil", "In-market: Cars"],
      ["Lüks", "Lüks alışveriş"],
    ]);
    expect(r.sheets.adform![0]!.secimNedeni).toBe("Brief otomobil alıcısını hedefliyor.");
    expect(r.sheets.adform![0]!.audienceId).toBeNull(); // Audience Id yalnız Amazon
    expect(r.sheets.amazon![0]).toMatchObject({ audienceId: "amz-1", cpmTl: 10, reach: "800K" });
    expect(r.ortalamaDataCpm.adform).toBeCloseTo((12.5 + 9) / 2, 10);
  });
  it("listede olmayan kimlik → hata (uydurma segment Excel'e girmez)", () => {
    expect(() => resolveAudience({ ...llm, adform: [{ grup: "x", segmentId: "s99", secimNedeni: "uydurma segment" }] }, lists, ["adform"])).toThrow(
      UydurmaSegmentHatasi,
    );
    expect(() => resolveAudience({ ...llm, dv360: [{ grup: "x", segmentId: "s1", secimNedeni: "liste yok ama seçti" }] }, lists, ["dv360"])).toThrow(
      UydurmaSegmentHatasi,
    );
  });
  it("sağlayıcısı boş segment", () => {
    const r = resolveAudience(
      { ...llm, amazon: [{ grup: "a", segmentId: "s1", secimNedeni: "sağlayıcı yok." }] },
      { amazon: [{ id: "s1", ad: "A", saglayici: null, cpmTl: null, reach: null, audienceId: null }] },
      ["amazon"],
    );
    expect(r.sheets.amazon![0]!.saglayici).toBe("");
  });
  it("CPM yoksa ortalama null", () => {
    const r = resolveAudience({ ...llm, adform: [{ grup: "a", segmentId: "s3", secimNedeni: "cpm yok burada." }] }, lists, ["adform"]);
    expect(r.ortalamaDataCpm.adform).toBeNull();
  });
  it("tekCumle", () => {
    expect(tekCumle("  Bir.  İki. ")).toBe("Bir.");
    expect(tekCumle("Nokta yok")).toBe("Nokta yok");
  });
  it("şema sayı alanı içermez", () => {
    const shape = Object.keys(audienceLlmSchema.shape);
    expect(shape).not.toContain("cpm");
    expect(audienceLlmSchema.safeParse({ ...llm, adform: [{ grup: "a", segmentId: "x1", secimNedeni: "geçersiz kimlik" }] }).success).toBe(false);
  });
});

describe("prompt", () => {
  it("kurallar ve listeler", () => {
    expect(SYSTEM_PROMPT).toContain("Digiseg TR → Belogic TR → Adform Audience Hub");
    expect(SYSTEM_PROMPT).toContain("8-15 TL");
    expect(SYSTEM_PROMPT).toContain("UYDURMA");
    const p = buildUserPrompt({
      brief: " SUV lansmanı ",
      dspler: ["adform", "amazon", "dv360"],
      kampanyaTipi: "retargeting",
      pazar: "Türkiye",
      butce: "500.000 TL",
      donem: null,
      segments: lists,
    });
    expect(p).toContain("<brief>\nSUV lansmanı\n</brief>");
    expect(p).toContain("s1 | Otomobil İlgilileri TR | Digiseg TR | 12.5");
    expect(p).toContain("s3 | Lüks alışveriş | Belogic TR | -");
    expect(p).toContain("DV360 segment listesi\n(liste yüklenmedi");
    expect(p).toContain("retargeting performans yayını");
    expect(p).toContain("Bütçe (bilgi amaçlı): 500.000 TL");
    expect(p).not.toContain("Dönem:");
    const q = buildUserPrompt({ brief: "x", dspler: ["amazon"], kampanyaTipi: "bilinirlik", pazar: "Türkiye", donem: "Ocak", segments: { amazon: [{ id: "s1", ad: "A", saglayici: null, cpmTl: null, reach: null, audienceId: null }] } });
    expect(q).toContain("s1 | A | - | -");
    expect(q).toContain("Dönem: Ocak");
  });
});

describe("excel", () => {
  const result = resolveAudience(
    { ...llm, retargeting: [{ kitle: "Sepete ekleyip almayanlar", kaynak: "site pixel", tanim: "Son 30 gün sepete ekleyip satın almayan ziyaretçiler." }], prospectingHaricTut: ["Satın alanlar (son 90 gün)"] },
    lists,
    ["adform", "amazon", "dv360"],
  );

  it("kolon sırası: Seçim Nedeni son, Audience Id yalnız Amazon", () => {
    expect(headersFor("amazon")).toEqual(["Grup", "Kitle Adı", "Sağlayıcı/Kategori", "CPM-Fee (TL)", "UID/Reach", "Audience Id", "Seçim Nedeni"]);
    expect(headersFor("adform").at(-1)).toBe("Seçim Nedeni");
    expect(headersFor("adform")).not.toContain("Audience Id");
    expect(rowFor("amazon", result.sheets.amazon![0]!)).toHaveLength(7);
  });

  it("not satırı", () => {
    expect(noteFor(result, "adform")).toContain("10,75 TL");
    expect(noteFor(result, "adform")).toContain("Satın alanlar");
    expect(noteFor(result, "dv360")).toContain("CPM bilgisi yok");
  });

  it("3P workbook: sheet adları, başlık, renkli satırlar, alt not", async () => {
    const buf = await buildAudienceWorkbook(ExcelJS, result, ["amazon", "adform"]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Adform", "Amazon"]);
    const ws = wb.getWorksheet("Adform")!;
    expect(ws.getRow(1).values).toEqual([undefined, ...headersFor("adform")]);
    expect(ws.getRow(2).getCell(1).value).toBe("Retargeting (1P)");
    expect(ws.getRow(3).getCell(1).value).toBe("Prospecting — Otomobil");
    const f2 = ws.getRow(2).getCell(1).fill as { fgColor: { argb: string } };
    const f3 = ws.getRow(3).getCell(1).fill as { fgColor: { argb: string } };
    expect(f2.fgColor.argb).not.toBe(f3.fgColor.argb);
    const last = ws.getRow(ws.rowCount).getCell(1).value as string;
    expect(last).toMatch(/^Not — OR\/AND/);
    const amz = wb.getWorksheet("Amazon")!;
    expect(amz.getRow(3).getCell(6).value).toBe("amz-1");
  });

  it("DV360 sheet'i retargeting satırı almaz", async () => {
    const buf = await buildAudienceWorkbook(ExcelJS, result, ["dv360"]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.getWorksheet("DV360")!.getRow(2).getCell(1).value).toBe(null);
  });

  it("retargeting yoksa grup adları değişmez", async () => {
    const plain = resolveAudience(llm, lists, ["adform"]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await buildAudienceWorkbook(ExcelJS, plain, ["adform"]));
    expect(wb.getWorksheet("Adform")!.getRow(2).getCell(1).value).toBe("Otomobil");
  });

  it("sonuçta olmayan DSP sheet'i boş açılır", async () => {
    const plain = resolveAudience(llm, lists, ["adform"]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await buildAudienceWorkbook(ExcelJS, plain, ["adform", "dv360"]));
    expect(wb.getWorksheet("DV360")!.getRow(1).getCell(1).value).toBe("Grup");
  });

  it("keyword workbook: tek kolon, başlık yok", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await buildKeywordWorkbook(ExcelJS, ["a", "b"]));
    const ws = wb.worksheets[0]!;
    expect(ws.rowCount).toBe(2);
    expect(ws.columnCount).toBe(1);
    expect(ws.getRow(1).getCell(1).value).toBe("a");
  });

  it("çok grup → renkler döner", async () => {
    const many = { ...result, retargeting: [], sheets: { adform: Array.from({ length: 10 }, (_, i) => ({ ...result.sheets.adform![0]!, grup: `g${i}` })) } };
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await buildAudienceWorkbook(ExcelJS, many, ["adform"]));
    expect(wb.getWorksheet("Adform")!.rowCount).toBeGreaterThan(10);
  });
});
