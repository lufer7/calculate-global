import { describe, expect, it } from "vitest";
import { communityCell, iqrOutliers, percentile, type Submission } from "./community";

const now = new Date("2026-11-18T00:00:00Z");
const day = 86_400_000;
const sub = (cpm: number, kullanici: string, gunOnce = 1): Submission => ({
  cpm,
  kullanici,
  tarih: new Date(now.getTime() - gunOnce * day),
});

describe("percentile", () => {
  it("doğrusal enterpolasyon", () => {
    const s = [1, 2, 3, 4];
    expect(percentile(s, 0.5)).toBe(2.5);
    expect(percentile(s, 0.25)).toBe(1.75);
    expect(percentile([7], 0.75)).toBe(7);
    expect(percentile([], 0.5)).toBeNaN();
  });
});

describe("iqrOutliers", () => {
  it("uç değeri işaretler", () => {
    expect(iqrOutliers([10, 11, 12, 13, 14, 500])).toEqual([false, false, false, false, false, true]);
    expect(iqrOutliers([1, 10, 11, 12, 13])).toEqual([true, false, false, false, false]);
  });
});

describe("communityCell", () => {
  it("5 kayıttan az → gösterilmez", () => {
    expect(communityCell([sub(10, "a"), sub(11, "b"), sub(12, "c"), sub(13, "d")], now)).toBeNull();
  });

  it("5 kayıt, 5 kullanıcı → gösterilir ama birincil değil (8 girdi eşiği)", () => {
    const c = communityCell(["a", "b", "c", "d", "e"].map((u, i) => sub(10 + i, u)), now)!;
    expect(c.girdi).toBe(5);
    expect(c.medyan).toBe(12);
    expect(c.birincil).toBe(false);
  });

  it("8 girdi + 5 katkıcı → birincil", () => {
    const users = ["a", "b", "c", "d", "e", "a", "b", "c"];
    const c = communityCell(users.map((u, i) => sub(10 + i, u)), now)!;
    expect(c.girdi).toBe(8);
    expect(c.katkici).toBe(5);
    expect(c.birincil).toBe(true);
    expect(c.p25).toBeCloseTo(11.75, 10);
    expect(c.p75).toBeCloseTo(15.25, 10);
  });

  it("8 girdi ama 4 katkıcı → birincil değil", () => {
    const users = ["a", "b", "c", "d", "a", "b", "c", "d"];
    expect(communityCell(users.map((u, i) => sub(10 + i, u)), now)!.birincil).toBe(false);
  });

  it("90 günden eski, geçersiz ve uç değerler elenir", () => {
    const subs = [
      ...["a", "b", "c", "d", "e"].map((u, i) => sub(10 + i, u)),
      sub(12, "f", 120),
      sub(-5, "g"),
      sub(10_000, "h"),
    ];
    const c = communityCell(subs, now)!;
    expect(c.girdi).toBe(5);
  });

  it("özel eşikler", () => {
    const c = communityCell([sub(1, "a"), sub(2, "b")], now, {
      minGirdi: 2,
      minKatkici: 2,
      minGosterim: 2,
      pencereGun: 30,
    })!;
    expect(c.birincil).toBe(true);
  });
});
