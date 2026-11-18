import { describe, expect, it } from "vitest";
import { pacing } from "./pacing";

describe("pacing", () => {
  it("30 günlük 300.000 TL, 10. gün, 80.000 harcanmış → %20 geride", () => {
    const r = pacing({ toplamButce: 300_000, toplamGun: 30, gecenGun: 10, harcanan: 80_000 })!;
    expect(r.harcanmasiGereken).toBe(100_000);
    expect(r.sapmaYuzde).toBeCloseTo(-20, 10);
    expect(r.fark).toBe(-20_000);
    expect(r.kalanButce).toBe(220_000);
    expect(r.kalanGun).toBe(20);
    expect(r.gerekenGunlukHarcama).toBe(11_000);
    expect(r.tamamlanmaProjeksiyonu).toBe(240_000);
    expect(r.durum).toBe("geride");
  });

  it("önde", () => {
    const r = pacing({ toplamButce: 100, toplamGun: 10, gecenGun: 5, harcanan: 60 })!;
    expect(r.sapmaYuzde).toBeCloseTo(20, 10);
    expect(r.durum).toBe("onde");
  });

  it("tolerans içinde yolunda", () => {
    expect(pacing({ toplamButce: 100, toplamGun: 10, gecenGun: 5, harcanan: 52 })!.durum).toBe("yolunda");
    expect(pacing({ toplamButce: 100, toplamGun: 10, gecenGun: 5, harcanan: 52, tolerans: 1 })!.durum).toBe("onde");
  });

  it("ilk gün: sapma tanımsız, projeksiyon yok", () => {
    const r = pacing({ toplamButce: 100, toplamGun: 10, gecenGun: 0, harcanan: 0 })!;
    expect(r.sapmaYuzde).toBeNull();
    expect(r.durum).toBeNull();
    expect(r.tamamlanmaProjeksiyonu).toBeNull();
  });

  it("son gün: gereken günlük harcama tanımsız", () => {
    const r = pacing({ toplamButce: 100, toplamGun: 10, gecenGun: 10, harcanan: 100 })!;
    expect(r.gerekenGunlukHarcama).toBeNull();
    expect(r.durum).toBe("yolunda");
  });

  it("geçersiz girdi → null", () => {
    expect(pacing({ toplamButce: 100, toplamGun: 0, gecenGun: 0, harcanan: 0 })).toBeNull();
    expect(pacing({ toplamButce: 100, toplamGun: 10, gecenGun: 11, harcanan: 0 })).toBeNull();
    expect(pacing({ toplamButce: -1, toplamGun: 10, gecenGun: 1, harcanan: 0 })).toBeNull();
    expect(pacing({ toplamButce: 100, toplamGun: 10, gecenGun: 1, harcanan: NaN })).toBeNull();
  });
});
