import { describe, expect, it } from "vitest";
import { computeBand, isPublishable, mergeBands, mid, pctChange, sourceDivergence, toTl, type BenchmarkPoint } from "./model";

const base: BenchmarkPoint = {
  format: "ctv",
  donem: "2026-10",
  paraBirimi: "USD",
  min: 20,
  max: 30,
  kurDegeri: 40,
  kurTarihi: "2026-10-31",
  kurKaynagi: "TCMB efektif satış",
  kaynakAdi: "TEST",
};
const adj = { katsayi: 0.5, metotNotu: "test notu" };

describe("yardımcılar", () => {
  it("mid / toTl / pctChange", () => {
    expect(mid(20, 30)).toBe(25);
    expect(toTl(10, 40, 0.5)).toBe(200);
    expect(pctChange(110, 100)).toBeCloseTo(10, 10);
    expect(pctChange(1, 0)).toBeNull();
    expect(pctChange(NaN, 1)).toBeNull();
    expect(pctChange(1, Infinity)).toBeNull();
  });
});

describe("computeBand", () => {
  it("TL bandı = kaynak × kur × katsayı", () => {
    const b = computeBand(base, null, adj)!;
    expect(b.tlMin).toBe(400);
    expect(b.tlMax).toBe(600);
    expect(b.tlOrta).toBe(500);
    expect(b.kaynakOrta).toBe(25);
    expect(b.degisimTl).toBeNull();
    expect(b.degisimKaynak).toBeNull();
    expect(b.metotNotu).toBe("test notu");
  });

  it("kur etkisi ile gerçek değişim ayrışır", () => {
    // USD'de değişim yok, kur %10 artmış → TL'de %10, USD'de %0
    const prev = { ...base, donem: "2026-09", kurDegeri: 40 };
    const cur = { ...base, kurDegeri: 44 };
    const b = computeBand(cur, prev, adj)!;
    expect(b.degisimTl).toBeCloseTo(10, 10);
    expect(b.degisimKaynak).toBeCloseTo(0, 10);
  });

  it("farklı para birimli önceki dönem karşılaştırılmaz", () => {
    const prev = { ...base, paraBirimi: "EUR" as const };
    const b = computeBand(base, prev, adj)!;
    expect(b.degisimTl).toBeNull();
  });

  it("geçersiz önceki dönem yok sayılır", () => {
    expect(computeBand(base, { ...base, min: 0 }, adj)!.degisimTl).toBeNull();
  });

  it("katsayı yoksa / metot notu boşsa yayınlanmaz", () => {
    expect(computeBand(base, null, null)).toBeNull();
    expect(computeBand(base, null, { katsayi: 0, metotNotu: "x" })).toBeNull();
    expect(computeBand(base, null, { katsayi: 1, metotNotu: "  " })).toBeNull();
  });

  it("geçersiz değerler → null", () => {
    expect(computeBand({ ...base, min: 40 }, null, adj)).toBeNull(); // min > max
    expect(computeBand({ ...base, kurDegeri: 0 }, null, adj)).toBeNull();
    expect(computeBand({ ...base, max: NaN }, null, adj)).toBeNull();
  });
});

describe("kaynaklar arası tutarlılık (§4.1b)", () => {
  it("sapma = (max − min) / min", () => {
    expect(sourceDivergence([100, 130])).toBeCloseTo(0.3, 10);
    expect(sourceDivergence([100])).toBeNull();
    expect(sourceDivergence([100, -1, NaN])).toBeNull();
  });
  it("%40 eşiği", () => {
    expect(isPublishable([100, 140])).toBe(true);
    expect(isPublishable([100, 141])).toBe(false);
    expect(isPublishable([100, 160], 0.6)).toBe(true);
    expect(isPublishable([100])).toBe(true);
    expect(isPublishable([])).toBe(false);
    expect(isPublishable([0, NaN])).toBe(false);
  });
});

describe("mergeBands", () => {
  const b1 = computeBand(base, { ...base, donem: "2026-09", kurDegeri: 40, min: 18, max: 28 }, adj)!;
  const b2 = computeBand({ ...base, min: 22, max: 34, kaynakAdi: "B" }, null, adj)!;

  it("boş → veri_yok", () => {
    expect(mergeBands("ctv", [])).toEqual({ format: "ctv", durum: "veri_yok", bantlar: [] });
  });
  it("tek kaynak", () => {
    const m = mergeBands("ctv", [b1]);
    expect(m.durum).toBe("ok");
    expect(m.tlMin).toBe(400);
    expect(m.tlMax).toBe(600);
    expect(m.sapma).toBeNull();
    expect(m.degisimTl).toBeCloseTo(b1.degisimTl!, 10);
  });
  it("iki tutarlı kaynak → geniş bant, değişim ortalaması mevcut olanlardan", () => {
    const m = mergeBands("ctv", [b1, b2]);
    expect(m.durum).toBe("ok");
    expect(m.tlMin).toBe(400);
    expect(m.tlMax).toBe(680);
    expect(m.degisimTl).toBeCloseTo(b1.degisimTl!, 10);
    expect(m.degisimKaynak).toBeCloseTo(b1.degisimKaynak!, 10);
  });
  it("değişimi olmayan kaynaklar → null", () => {
    expect(mergeBands("ctv", [b2]).degisimTl).toBeNull();
  });
  it("%40'tan fazla sapma → tutarsiz, sayı yok", () => {
    const far = computeBand({ ...base, min: 40, max: 60 }, null, adj)!;
    const m = mergeBands("ctv", [b1, far]);
    expect(m.durum).toBe("tutarsiz");
    expect(m.tlMin).toBeUndefined();
    expect(m.sapma).toBeCloseTo(1, 10);
  });
});
