import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { dogrulamaDurumu, filtreleMecra, mecraSchema } from "./schema";

describe("dogrulamaDurumu", () => {
  const now = new Date("2026-11-18T00:00:00Z");
  it("hiç doğrulanmamış", () => expect(dogrulamaDurumu(null, now)).toEqual({ durum: "dogrulanmadi", ay: null }));
  it("güncel", () => expect(dogrulamaDurumu("2026-09-01", now)).toEqual({ durum: "guncel", ay: 2 }));
  it("tam 6 ay → eski", () => expect(dogrulamaDurumu("2026-05-18", now).durum).toBe("eski"));
  it("6 ay dolmamış → güncel", () => expect(dogrulamaDurumu("2026-05-19", now)).toEqual({ durum: "guncel", ay: 5 }));
  it("özel eşik", () => expect(dogrulamaDurumu("2026-10-01", now, 1).durum).toBe("eski"));
});

const base = {
  mecra: "Test",
  kanal: ["ctv"],
  tur: "video",
  ozet: "bir test mecrası",
};

describe("mecraSchema", () => {
  it("minimal kayıt geçerli, doğrulama null", () => {
    const r = mecraSchema.parse(base);
    expect(r.son_dogrulama).toBeNull();
  });
  it("doğrulanmış kayıt kaynak_url ister", () => {
    expect(mecraSchema.safeParse({ ...base, son_dogrulama: "2026-01-01" }).success).toBe(false);
    expect(mecraSchema.safeParse({ ...base, son_dogrulama: "2026-01-01", kaynak_url: "https://ornek.com/spec" }).success).toBe(true);
  });
  it("CPM bandı kaynak ister ve max ≥ min", () => {
    expect(mecraSchema.safeParse({ ...base, tahmini_cpm_bandi: { min: 5, max: 3, para: "TRY", kaynak: "xxx", tarih: "2026" } }).success).toBe(false);
    expect(mecraSchema.safeParse({ ...base, tahmini_cpm_bandi: { min: 3, max: 5, para: "TRY" } }).success).toBe(false);
  });
});

describe("filtreleMecra", () => {
  const list = [
    { mecra: "Alfa", kanal: ["ctv"], tur: "video", dspler: [{ dsp: "DV360", satin_alma: ["PG"] }], formatlar: [{ ad: "In-stream" }] },
    { mecra: "Beta Ses", kanal: ["ses", "mobil"], tur: "ses", dspler: [{ dsp: "Amazon DSP", satin_alma: ["PMP"] }], formatlar: [{ ad: "Audio" }] },
  ] as never[];
  it("filtreler", () => {
    expect(filtreleMecra(list, {})).toHaveLength(2);
    expect(filtreleMecra(list, { kanal: "ses" })).toHaveLength(1);
    expect(filtreleMecra(list, { dsp: "DV360" })).toHaveLength(1);
    expect(filtreleMecra(list, { satinAlma: "PMP" })).toHaveLength(1);
    expect(filtreleMecra(list, { format: "In-stream" })).toHaveLength(1);
    expect(filtreleMecra(list, { q: "beta" })).toHaveLength(1);
    expect(filtreleMecra(list, { q: "SES" })).toHaveLength(1);
    expect(filtreleMecra(list, { q: "yok" })).toHaveLength(0);
  });
});

describe("content/mecra", () => {
  const dir = path.join(process.cwd(), "content", "mecra");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  it("en az 20 mecra", () => expect(files.length).toBeGreaterThanOrEqual(20));
  it.each(files)("%s şemaya uyuyor", (f) => {
    const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    const r = mecraSchema.safeParse(data);
    expect(r.success, r.success ? "" : r.error.message).toBe(true);
  });
});
