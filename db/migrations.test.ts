/**
 * Migration'ları bellek içi Postgres'te (PGlite) çalıştırır ve §0 / §4.1 / §4.3
 * kurallarının gerçekten DB seviyesinde zorlandığını doğrular.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dir = path.join(__dirname, "migrations");
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of fs.readFileSync(path.join(dir, f), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await db.exec(stmt);
    }
  }
}, 30_000);

function benchmark(over: Record<string, string | number> = {}) {
  const row: Record<string, string | number> = {
    format: "banner",
    para_birimi: "USD",
    deger_min: 1,
    deger_max: 2,
    kur_degeri: 40,
    kur_tarihi: "2026-10-31",
    kur_kaynagi: "TCMB efektif satış",
    kaynak: "public_benchmark",
    kaynak_adi: "test",
    donem: "2026-10",
    ...over,
  };
  const cols = Object.keys(row);
  return db.query(
    `insert into cpm_benchmarks (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
    Object.values(row),
  );
}

describe("cpm_benchmarks kısıtları", () => {
  it("geçerli public benchmark kabul edilir", async () => {
    await expect(benchmark()).resolves.toBeDefined();
  });
  it.each(["public_benchmark", "topluluk", "editoryel_tahmin"])("kaynak=%s kabul", async (kaynak) => {
    await expect(benchmark({ kaynak })).resolves.toBeDefined();
  });
  it.each(["ajans_dsp", "dsp_export", "gemius", ""])("kaynak=%s REDDEDİLİR (§0)", async (kaynak) => {
    await expect(benchmark({ kaynak })).rejects.toThrow(/cpm_benchmarks_kaynak_chk/);
  });
  it("min > max reddedilir", async () => {
    await expect(benchmark({ deger_min: 3, deger_max: 2 })).rejects.toThrow(/bant_chk/);
  });
  it("geçersiz dönem reddedilir", async () => {
    await expect(benchmark({ donem: "2026-13" })).rejects.toThrow(/donem_chk/);
  });
  it("tanımsız platform reddedilir", async () => {
    await expect(benchmark({ platform: "tv" })).rejects.toThrow(/platform_chk/);
    await expect(benchmark({ platform: "social" })).resolves.toBeDefined();
  });
  it("kaynak NULL olamaz", async () => {
    await expect(
      db.query(
        `insert into cpm_benchmarks (format, para_birimi, deger_min, deger_max, kur_degeri, kur_tarihi, kur_kaynagi, kaynak_adi, donem)
         values ('banner','USD',1,2,40,'2026-10-31','TCMB','x','2026-10')`,
      ),
    ).rejects.toThrow(/null/i);
  });
  it("TL değer kolonu yok (Kural 1)", async () => {
    const cols = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'cpm_benchmarks'`,
    );
    expect(cols.rows.map((r) => r.column_name)).not.toContain("deger_tl");
  });
});

describe("cpm_adjustments", () => {
  it("metot notu en az 20 karakter olmalı (Kural 2)", async () => {
    await expect(
      db.query(
        `insert into cpm_adjustments (format, katsayi, metot_notu, gecerlilik_baslangic) values ('banner', 0.4, 'kısa', '2026-10-01')`,
      ),
    ).rejects.toThrow(/metot_chk/);
    await expect(
      db.query(
        `insert into cpm_adjustments (format, katsayi, metot_notu, gecerlilik_baslangic) values ('banner', 0.4, 'IAB Türkiye yatırım raporu ile ABD hacim oranı karşılaştırması', '2026-10-01')`,
      ),
    ).resolves.toBeDefined();
  });
});

describe("domain_snapshots", () => {
  it("mutlak ziyaret kolonu yok (§4.2)", async () => {
    const cols = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'domain_snapshots'`,
    );
    const names = cols.rows.map((r) => r.column_name);
    expect(names.some((n) => /ziyaret|visit/.test(n))).toBe(false);
  });
});

describe("RLS ve ayarlar", () => {
  it("tüm tablolarda RLS açık", async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(r.rows.length).toBeGreaterThan(10);
    expect(r.rows.filter((x) => !x.relrowsecurity).map((x) => x.relname)).toEqual([]);
  });
  it("cpm_settings varsayılan eşikleri (8 girdi / 5 katkıcı)", async () => {
    const r = await db.query<{ min_girdi: number; min_katkici: number }>(`select * from cpm_settings`);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ min_girdi: 8, min_katkici: 5 });
  });
});
