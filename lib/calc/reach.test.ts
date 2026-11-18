import { describe, expect, it } from "vitest";
import {
  budgetFromImpressions,
  combineChannels,
  estimateReach,
  exposureDistribution,
  frequencyTradeoff,
  impressionsForReach,
  impressionsFromBudget,
  marginalNewReach,
  reachCurve,
  reachShareAtLeast,
  saturationLambda,
} from "./reach";

describe("impression ↔ bütçe", () => {
  it("bütçe / CPM × 1000", () => {
    expect(impressionsFromBudget(100_000, 25)).toBe(4_000_000);
    expect(budgetFromImpressions(4_000_000, 25)).toBe(100_000);
  });
  it("geçersiz", () => {
    expect(impressionsFromBudget(1, 0)).toBeNull();
    expect(impressionsFromBudget(-1, 2)).toBeNull();
    expect(budgetFromImpressions(NaN, 2)).toBeNull();
  });
});

describe("maruz kalma dağılımı", () => {
  it("Poisson toplamı ~1 ve P(0)=e^-λ", () => {
    const d = exposureDistribution(2, 60);
    expect(d[0]).toBeCloseTo(Math.exp(-2), 12);
    expect(d[1]).toBeCloseTo(2 * Math.exp(-2), 12);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("NBD toplamı ~1, P(0)=(r/(r+λ))^r", () => {
    const d = exposureDistribution(2, 400, 1.5);
    expect(d[0]).toBeCloseTo(Math.pow(1.5 / 3.5, 1.5), 12);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it("büyük r → Poisson'a yakınsar", () => {
    expect(exposureDistribution(1.3, 5, 1e7)[3]).toBeCloseTo(exposureDistribution(1.3, 5)[3]!, 5);
  });
  it("λ = 0", () => {
    expect(exposureDistribution(0, 2)).toEqual([1, 0, 0]);
    expect(exposureDistribution(0, 2, 2)).toEqual([1, 0, 0]);
  });
  it("büyük λ'da sayısal kararlılık", () => {
    const d = exposureDistribution(800, 1300);
    expect(d.every(Number.isFinite)).toBe(true);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe("reachShareAtLeast", () => {
  it("1+ = 1 − e^−λ", () => expect(reachShareAtLeast(1, 1)).toBeCloseTo(1 - Math.exp(-1), 12));
  it("n ≤ 0 → 1", () => expect(reachShareAtLeast(1, 0)).toBe(1));
  it("n arttıkça azalır", () => {
    const v = [1, 2, 3, 5, 10].map((n) => reachShareAtLeast(3, n));
    for (let i = 1; i < v.length; i++) expect(v[i]!).toBeLessThan(v[i - 1]!);
  });
  it("NBD (yoğunlaşma) 1+ reach'i düşürür", () => {
    expect(reachShareAtLeast(2, 1, 1)).toBeLessThan(reachShareAtLeast(2, 1));
  });
});

describe("doyma", () => {
  it("Poisson: λ = ln 5, marjinal = %20", () => {
    expect(saturationLambda()).toBeCloseTo(Math.log(5), 12);
    expect(marginalNewReach(saturationLambda())).toBeCloseTo(0.2, 12);
  });
  it("NBD: marjinal eşikte %20", () => {
    expect(marginalNewReach(saturationLambda(2), 2)).toBeCloseTo(0.2, 12);
  });
});

describe("estimateReach", () => {
  it("örnek: 10M universe, 10M impression → λ=1, 1+ ≈ %63,2", () => {
    const r = estimateReach(10_000_000, 10_000_000)!;
    expect(r.lambda).toBe(1);
    expect(r.reach[0]!.yuzde).toBeCloseTo((1 - Math.exp(-1)) * 100, 8);
    expect(r.ortalamaFrekans).toBeCloseTo(1 / (1 - Math.exp(-1)), 8);
    expect(r.doymaGecildi).toBe(false);
  });
  it("erişilebilir oran tavanı düşürür, yüzde universe'e göre", () => {
    const r = estimateReach(100_000_000, 10_000_000, { erisilebilirOran: 0.5 })!;
    expect(r.erisilebilir).toBe(5_000_000);
    expect(r.reach[0]!.yuzde).toBeLessThanOrEqual(50);
    expect(r.doymaGecildi).toBe(true);
  });
  it("sıfır impression", () => {
    const r = estimateReach(0, 1000)!;
    expect(r.reach[0]!.kisi).toBe(0);
    expect(r.ortalamaFrekans).toBeNull();
  });
  it("1 eşiği listede yoksa da ortalama frekans hesaplanır", () => {
    expect(estimateReach(1000, 1000, {}, [3])!.ortalamaFrekans).toBeGreaterThan(1);
  });
  it("geçersiz girdi", () => {
    expect(estimateReach(1, 0)).toBeNull();
    expect(estimateReach(-1, 10)).toBeNull();
    expect(estimateReach(1, 10, { erisilebilirOran: 0 })).toBeNull();
    expect(estimateReach(1, 10, { erisilebilirOran: 1.2 })).toBeNull();
  });
});

describe("impressionsForReach (ters yön)", () => {
  it("estimateReach ile tutarlı", () => {
    const U = 20_000_000;
    for (const [n, p] of [[1, {}], [3, {}], [3, { r: 2 }], [5, { erisilebilirOran: 0.8 }]] as const) {
      const imp = impressionsForReach(6_000_000, n, U, p)!;
      const back = estimateReach(imp, U, p, [n])!.reach[0]!.kisi;
      expect(back).toBeCloseTo(6_000_000, -1);
    }
  });
  it("sıfır hedef → 0, tavan ve geçersiz → null", () => {
    expect(impressionsForReach(0, 1, 100)).toBe(0);
    expect(impressionsForReach(100, 1, 100)).toBeNull();
    expect(impressionsForReach(60, 1, 100, { erisilebilirOran: 0.5 })).toBeNull();
    expect(impressionsForReach(10, 0, 100)).toBeNull();
    expect(impressionsForReach(10, 1, 0)).toBeNull();
    expect(impressionsForReach(-1, 1, 100)).toBeNull();
  });
  it("çok yüksek frekans eşiği → arama sınırı → null", () => {
    expect(impressionsForReach(99, 2_000_000, 100)).toBeNull();
  });
});

describe("reachCurve", () => {
  it("monoton artan, 41 nokta", () => {
    const c = reachCurve(1_000_000, 20, 10_000_000, 3);
    expect(c).toHaveLength(41);
    expect(c[0]!.reach1).toBe(0);
    for (let i = 1; i < c.length; i++) {
      expect(c[i]!.reach1).toBeGreaterThan(c[i - 1]!.reach1);
      expect(c[i]!.reachN).toBeLessThanOrEqual(c[i]!.reach1);
    }
  });
  it("geçersiz → boş", () => {
    expect(reachCurve(0, 20, 100, 1)).toEqual([]);
    expect(reachCurve(100, 0, 100, 1)).toEqual([]);
    expect(reachCurve(100, 20, 0, 1)).toEqual([]);
    expect(reachCurve(100, 20, 100, 1, {}, 0)).toEqual([]);
  });
});

describe("frequencyTradeoff", () => {
  it("6+ reach < 3+ reach; ek bütçe pozitif", () => {
    const t = frequencyTradeoff(500_000, 25, 20_000_000, 3, 6)!;
    expect(t.reachB).toBeLessThan(t.reachA);
    expect(t.ayniButceFark).toBeCloseTo(t.reachA - t.reachB, 6);
    expect(t.ekButce!).toBeGreaterThan(0);
  });
  it("hedef ulaşılamazsa ek bütçe null", () => {
    // Çok yüksek bütçe: 1+ reach tavana yakın; aynı kişiye 50+ ile ulaşmak hesap sınırını aşar
    const t = frequencyTradeoff(1e9, 1, 1000, 1, 2_000_000)!;
    expect(t.ekButce).toBeNull();
  });
  it("geçersiz", () => {
    expect(frequencyTradeoff(1, 0, 10, 1, 2)).toBeNull();
    expect(frequencyTradeoff(1, 1, 0, 1, 2)).toBeNull();
    expect(frequencyTradeoff(1, 1, 10, 0, 2)).toBeNull();
    expect(frequencyTradeoff(1, 1, 10, 1, 0)).toBeNull();
  });
});

describe("combineChannels", () => {
  const U = 10_000_000;
  const k = [
    { ad: "display", butce: 200_000, cpm: 20 },
    { ad: "video", butce: 200_000, cpm: 80 },
  ];
  it("çakışma 0 → toplam, 1 → en büyük, rastgele arada", () => {
    const a = combineChannels(k, U, 0)!;
    const b = combineChannels(k, U, 1)!;
    const sum = a.kanallar[0]!.reach + a.kanallar[1]!.reach;
    const max = Math.max(a.kanallar[0]!.reach, a.kanallar[1]!.reach);
    expect(a.birlesik).toBeCloseTo(Math.min(U, sum), 6);
    expect(b.birlesik).toBeCloseTo(max, 6);
    expect(a.rastgele).toBeGreaterThan(max);
    expect(a.rastgele).toBeLessThan(sum);
    expect(a.toplamButce).toBe(400_000);
    expect(a.toplamImpression).toBe(10_000_000 + 2_500_000);
  });
  it("universe ile sınırlı", () => {
    const big = [
      { ad: "a", butce: 1e9, cpm: 1 },
      { ad: "b", butce: 1e9, cpm: 1 },
    ];
    expect(combineChannels(big, 1000, 0)!.birlesik).toBe(1000);
  });
  it("geçersiz", () => {
    expect(combineChannels([], U, 0)).toBeNull();
    expect(combineChannels(k, U, 1.5)).toBeNull();
    expect(combineChannels(k, 0, 0)).toBeNull();
    expect(combineChannels([{ ad: "x", butce: 1, cpm: 0 }], U, 0)).toBeNull();
    expect(combineChannels([{ ad: "x", butce: 1, cpm: 1, params: { erisilebilirOran: 2 } }], U, 0)).toBeNull();
  });
});
