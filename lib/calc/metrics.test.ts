import { describe, expect, it } from "vitest";
import * as m from "./metrics";

describe("ratio", () => {
  it("a / b × k", () => {
    expect(m.ratio(10, 4)).toBe(2.5);
    expect(m.ratio(10, 4, 100)).toBe(250);
  });
  it("geçersiz girdi → null", () => {
    expect(m.ratio(1, 0)).toBeNull();
    expect(m.ratio(-1, 2)).toBeNull();
    expect(m.ratio(1, -2)).toBeNull();
    expect(m.ratio(NaN, 2)).toBeNull();
    expect(m.ratio(1, Infinity)).toBeNull();
    expect(m.ratio(1, 2, 0)).toBeNull();
    expect(m.ratio(1, 2, NaN)).toBeNull();
  });
  it("pay sıfır olabilir", () => {
    expect(m.ratio(0, 5)).toBe(0);
  });
});

describe("metrik formülleri", () => {
  it("CPM: 5.000 TL / 1.000.000 imp = 5 TL", () => expect(m.cpm(5000, 1_000_000)).toBe(5));
  it("Impression (CPM'den): 10.000 TL / 25 TL CPM = 400.000", () =>
    expect(m.impressionFromCpm(10_000, 25)).toBe(400_000));
  it("Bütçe (CPM'den): 400.000 imp × 25 TL = 10.000 TL", () => expect(m.budgetFromCpm(400_000, 25)).toBe(10_000));
  it("Bütçe geçersiz girdi → null", () => {
    expect(m.budgetFromCpm(-1, 25)).toBeNull();
    expect(m.budgetFromCpm(1, NaN)).toBeNull();
  });
  it("eCPM", () => expect(m.ecpm(1200, 300_000)).toBe(4));
  it("CPC", () => expect(m.cpc(1000, 250)).toBe(4));
  it("CTR: 150 klik / 100.000 imp = %0,15", () => expect(m.ctr(150, 100_000)).toBeCloseTo(0.15, 12));
  it("CPV", () => expect(m.cpv(900, 3000)).toBeCloseTo(0.3, 12));
  it("CPCV", () => expect(m.cpcv(900, 1800)).toBe(0.5));
  it("VTR", () => expect(m.vtr(3000, 10_000)).toBe(30));
  it("VCR", () => expect(m.vcr(2500, 10_000)).toBe(25));
  it("Viewability", () => expect(m.viewability(380, 1000)).toBe(38));
  it("vCPM = CPM / viewability", () => {
    const cost = 2000;
    const imp = 100_000;
    const viewable = 40_000;
    expect(m.vcpm(cost, viewable)).toBe(50);
    expect(m.vcpm(cost, viewable)).toBeCloseTo(m.cpm(cost, imp)! / (m.viewability(viewable, imp)! / 100), 10);
  });
  it("CPA", () => expect(m.cpa(5000, 40)).toBe(125));
  it("sıfıra bölme → null", () => {
    expect(m.cpm(100, 0)).toBeNull();
    expect(m.cpa(100, 0)).toBeNull();
  });
});
