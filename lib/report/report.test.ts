import { describe, expect, it } from "vitest";
import { autoMap, detectTemplate } from "./columns";
import { breakdown, daysBetween, frequencyBuckets, kpis, normalizeRows, reportPacing, summarize, totals, trend, weekStart, type StdRow } from "./metrics";
import { needsAdformFix, parseReportDate, parseReportNumber } from "./parse";

describe("parseReportNumber", () => {
  it.each([
    ["1,234.56", 1234.56],
    ["1.234,56", 1234.56],
    ["1,234", 1234],
    ["1.234.567", 1234567],
    ["1,234,567", 1234567],
    ["0,5", 0.5],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["₺4.718.371.200.958.550", 4718371200958550],
    ["$ 12.00", 12],
    ["45%", 45],
    ["(12.5)", -12.5],
    ["-3", -3],
    ["1234", 1234],
    ["12 TL", 12],
  ])("%s", (s, v) => expect(parseReportNumber(s)).toBeCloseTo(v, 6));
  it("sayı ve geçersizler", () => {
    expect(parseReportNumber(7)).toBe(7);
    expect(parseReportNumber(NaN)).toBeNull();
    expect(parseReportNumber(null)).toBeNull();
    expect(parseReportNumber(undefined)).toBeNull();
    expect(parseReportNumber("")).toBeNull();
    expect(parseReportNumber("-")).toBeNull();
    expect(parseReportNumber("abc")).toBeNull();
    expect(parseReportNumber("1..2")).toBe(12);
    expect(parseReportNumber(".")).toBeNull();
  });
});

describe("parseReportDate", () => {
  it.each([
    ["2026-11-03", "2026-11-03"],
    ["2026/11/03", "2026-11-03"],
    ["03.11.2026", "2026-11-03"],
    ["03/11/2026", "2026-11-03"],
    ["11/23/2026", "2026-11-23"],
    ["20261103", "2026-11-03"],
    ["2026-11-03 00:00:00", "2026-11-03"],
  ])("%s", (s, v) => expect(parseReportDate(s)).toBe(v));
  it.each([[""], [null], ["31.02.2026"], ["2026-13-01"], ["1999-01-01"], ["yarın"], ["2026-00-10"], ["2026-01-32"]])("%s → null", (s) =>
    expect(parseReportDate(s)).toBeNull(),
  );
});

describe("Adform 10^15 düzeltmesi", () => {
  it("medyan 10^12 üstü → düzelt", () => {
    expect(needsAdformFix([4718371200958550, 2e15, null])).toBe(true);
    expect(needsAdformFix([4.7, 2000, 1e13])).toBe(false);
    expect(needsAdformFix([null, 0])).toBe(false);
  });
});

describe("kolon eşleme", () => {
  it("DV360 benzeri başlıklar", () => {
    const h = ["Date", "Insertion Order", "Impressions", "Clicks", "Revenue (Adv Currency)", "Active View: Viewable Impressions", "Active View: Measurable Impressions", "Complete Views (Video)", "Total Conversions"];
    expect(autoMap(h)).toMatchObject({ tarih: 0, boyut: 1, impression: 2, klik: 3, harcama: 4, gorulebilir: 5, olculen: 6, videoTamamlama: 7, donusum: 8 });
    expect(detectTemplate(h)).toBe("dv360");
  });
  it("Türkçe başlıklar ve şablon tanınmaz", () => {
    const h = ["Tarih", "Mecra", "Gösterim", "Tıklama", "Harcama", "Dönüşüm", "Dönüşüm Değeri"];
    expect(autoMap(h)).toMatchObject({ tarih: 0, boyut: 1, impression: 2, klik: 3, harcama: 4, donusum: 5, donusumDegeri: 6 });
    expect(detectTemplate(h)).toBe("bilinmiyor");
  });
  it("içerme eşleşmesi ve şablonlar", () => {
    expect(autoMap(["Gün", "Toplam Impressions Sayısı"]).impression).toBe(1);
    expect(detectTemplate(["Tracked Ads", "Sales (Adv. currency)"])).toBe("adform");
    expect(detectTemplate(["Total cost", "DPV"])).toBe("amazon");
    expect(detectTemplate(["Placement ID", "Floodlight"])).toBe("cm360");
  });
});

const header = ["Tarih", "Mecra", "Impressions", "Clicks", "Spend", "Viewable Impressions", "Measurable Impressions", "Conversions"];
const raw = [
  ["2026-11-02", "Site A", "100000", "150", "2000", "60000", "90000", "10"],
  ["2026-11-03", "Site A", "100000", "100", "2000", "50000", "90000", "5"],
  ["2026-11-03", "Site B", "50000", "200", "1500", "", "", "20"],
  ["2026-11-04", "Site C", "500", "50", "10", "", "", "1"],
  ["Toplam", "", "250500", "500", "5510", "", "", "36"],
  ["", "", "", "", "", "", "", ""],
];

describe("normalize + özet", () => {
  const map = autoMap(header);
  const n = normalizeRows(raw, map);
  it("toplam satırı ve boş satır atlanır", () => {
    expect(n.rows).toHaveLength(4);
    expect(n.atlanan).toBe(2);
    expect(n.duzeltilen).toEqual([]);
  });
  it("totals + KPI'lar lib/calc ile", () => {
    const t = totals(n.rows);
    expect(t.impression).toBe(250500);
    expect(t.harcama).toBe(5510);
    expect(t.reach).toBeNull();
    expect(t.frekans).toBeNull();
    const k = kpis(t);
    expect(k.cpm).toBeCloseTo((5510 / 250500) * 1000, 8);
    expect(k.viewability).toBeCloseTo((110000 / 180000) * 100, 8);
    expect(k.viewabilityPayda).toBe("olculen");
    expect(k.cpa).toBeCloseTo(5510 / 36, 8);
    expect(k.cvr).toBeCloseTo((36 / 500) * 100, 8);
    expect(k.roas).toBeNull();
    expect(k.vcr).toBeNull();
  });
  it("viewability paydası impression'a düşer; ROAS; VCR video başlamaya göre", () => {
    const k = kpis({ ...totals(n.rows), olculen: null, donusumDegeri: 11020, videoTamamlama: 50, videoBaslama: 100 });
    expect(k.viewabilityPayda).toBe("impression");
    expect(k.roas).toBe(2);
    expect(k.vcr).toBe(50);
    expect(kpis({ ...totals([]) }).viewability).toBeNull();
  });
  it("trend: gün ve hafta", () => {
    const g = trend(n.rows, "gun");
    expect(g.map((x) => x.donem)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(g[1]!.impression).toBe(150000);
    expect(trend(n.rows, "hafta")).toHaveLength(1);
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
    expect(trend([{ ...n.rows[0]!, tarih: null }], "gun")).toEqual([]);
  });
  it("kırılım: %1 altı elenir, CPA ile sıralanır", () => {
    const b = breakdown(n.rows)!;
    expect(b.olcut).toBe("cpa");
    expect(b.satirSayisi).toBe(3);
    expect(b.enIyi.map((x) => x.ad)).toEqual(["Site B"]);
    expect(b.enKotu.map((x) => x.ad)).toEqual(["Site A"]);
  });
  it("kırılım: dönüşüm yoksa CTR; tek satır → null; tek anlamlı satır → boş listeler", () => {
    const noConv = n.rows.map((r) => ({ ...r, donusum: null }));
    expect(breakdown(noConv)!.olcut).toBe("ctr");
    expect(breakdown(noConv)!.enIyi[0]!.ad).toBe("Site B");
    expect(breakdown([n.rows[0]!])).toBeNull();
    expect(breakdown(n.rows.map((r) => ({ ...r, boyut: null })))).toBeNull();
    const two = breakdown([n.rows[0]!, n.rows[3]!])!;
    expect(two.enIyi).toEqual([]);
    expect(two.enKotu).toEqual([]);
  });
  it("frekans kovaları ve reach", () => {
    const rows: StdRow[] = [1.5, 3, 7, 12].map((f, i) => ({ ...n.rows[0]!, frekans: f, impression: 100, reach: 10 * (i + 1) }));
    expect(frequencyBuckets(rows)!.map((x) => x.pay)).toEqual([25, 25, 25, 25]);
    expect(frequencyBuckets(n.rows)).toBeNull();
    const t = totals(rows);
    expect(t.reach).toBe(40);
    expect(t.frekans).toBeCloseTo((1.5 + 3 + 7 + 12) / 4, 10);
  });
  it("Adform düzeltmesi normalize sırasında uygulanır", () => {
    const r = normalizeRows([["2026-11-01", "x", "1000", "1", "₺4.718.371.200.958.550"]], { tarih: 0, boyut: 1, impression: 2, klik: 3, harcama: 4 });
    expect(r.duzeltilen).toEqual(["harcama"]);
    expect(r.rows[0]!.harcama).toBeCloseTo(4.72, 2);
  });
  it("tarih kolonu yoksa / boyut yoksa", () => {
    const r = normalizeRows([["5", "6"]], { impression: 0, klik: 1 });
    expect(r.rows[0]).toMatchObject({ tarih: null, boyut: null, impression: 5, klik: 6, harcama: null });
  });
  it("pacing ve özet", () => {
    expect(daysBetween("2026-11-01", "2026-11-30")).toBe(29);
    const p = reportPacing(n.rows, totals(n.rows), { butce: 30000, baslangic: "2026-11-01", bitis: "2026-11-30" })!;
    expect(p.sonVeri).toBe("2026-11-04");
    expect(p.harcanmasiGereken).toBeCloseTo(4000, 8);
    expect(reportPacing(n.rows, totals(n.rows), { butce: null, baslangic: null, bitis: null })).toBeNull();
    expect(reportPacing([{ ...n.rows[0]!, tarih: null }], totals(n.rows), { butce: 1, baslangic: "2026-11-01", bitis: "2026-11-02" })).toBeNull();
    expect(reportPacing(n.rows, { ...totals(n.rows), harcama: null }, { butce: 1, baslangic: "2026-11-01", bitis: "2026-11-02" })).toBeNull();
    expect(reportPacing(n.rows, totals(n.rows), { butce: 1, baslangic: "2026-11-10", bitis: "2026-11-02" })).toBeNull();
    const s = summarize(n.rows, [], { butce: null, baslangic: null, bitis: null });
    expect(s.donem).toEqual({ bas: "2026-11-02", son: "2026-11-04" });
    expect(s.satir).toBe(4);
    expect(summarize([], [], { butce: null, baslangic: null, bitis: null }).donem).toEqual({ bas: null, son: null });
  });

  it("null metrikli ve kısa satırlar", () => {
    const r = normalizeRows([["10"], ["20", "x", "y", "z"]], { impression: 0, tarih: 3, boyut: 4 });
    expect(r.rows.map((x) => [x.tarih, x.boyut])).toEqual([[null, null], [null, null]]);
    const fix = normalizeRows([["1", "4718371200958550"], ["1", "-"], ["1", "5000000000000000"]], { impression: 0, harcama: 1 });
    expect(fix.rows[1]!.harcama).toBeNull();
    expect(fix.rows[2]!.harcama).toBe(5);
    const nulls: StdRow[] = [
      { tarih: "2026-11-01", boyut: "A", impression: null, klik: null, harcama: null, gorulebilir: null, olculen: null, videoBaslama: null, videoTamamlama: null, donusum: 1, donusumDegeri: null, frekans: 2, reach: null },
      { tarih: "2026-11-01", boyut: "B", impression: null, klik: null, harcama: null, gorulebilir: null, olculen: null, videoBaslama: null, videoTamamlama: null, donusum: 1, donusumDegeri: null, frekans: null, reach: null },
    ];
    expect(trend(nulls, "gun")[0]).toMatchObject({ impression: 0, klik: 0, harcama: 0 });
    const b = breakdown(nulls)!;
    expect(b.enIyi).toEqual([]);
    expect(frequencyBuckets(nulls)).toBeNull();
    const k = kpis({ ...totals([]), impression: 200, videoTamamlama: 50 });
    expect(k.vcr).toBe(25);
  });
  it("eşit CPA → alfabetik", () => {
    const row = (boyut: string): StdRow => ({ tarih: null, boyut, impression: 100, klik: 1, harcama: 10, gorulebilir: null, olculen: null, videoBaslama: null, videoTamamlama: null, donusum: 1, donusumDegeri: null, frekans: null, reach: null });
    expect(breakdown([row("b"), row("a"), row("c"), row("d")])!.enIyi.map((x) => x.ad)).toEqual(["a", "b"]);
  });
});
