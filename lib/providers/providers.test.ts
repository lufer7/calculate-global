import { describe, expect, it } from "vitest";
import { parseRadarDomain } from "./cloudflare-parse";
import { providerEnabled, type Lisans } from "./types";

const L = (p: Partial<Lisans>): Lisans => ({
  kaynak: "x",
  seviye: "public",
  lisansAdi: null,
  sartlarOkunduTarihi: null,
  publicSayfadaGosterilebilir: true,
  bulkCsvExportaDahil: true,
  atif: null,
  not: "",
  ...p,
});

describe("providerEnabled (§6.10)", () => {
  it("own her zaman açık", () => expect(providerEnabled(L({ seviye: "own" }), "production")).toBe(true));
  it("şartlar okunmamışsa production'da kapalı, geliştirmede açık", () => {
    expect(providerEnabled(L({}), "production")).toBe(false);
    expect(providerEnabled(L({}), "development")).toBe(true);
    expect(providerEnabled(L({ sartlarOkunduTarihi: "2026-11-20" }), "production")).toBe(true);
    expect(providerEnabled(L({ sartlarOkunduTarihi: "yarın" }), "production")).toBe(false);
  });
});

describe("parseRadarDomain", () => {
  it("beklenen biçim", () => {
    expect(
      parseRadarDomain({ success: true, result: { details_0: { rank: 1234, bucket: "2000", categories: [{ name: "News" }, { x: 1 }, null] } } }),
    ).toEqual({ rank: 1234, bucket: 2000, kategoriler: ["News"] });
  });
  it("yalnız kova, sayısal kova, '>200000' gibi metin", () => {
    expect(parseRadarDomain({ success: true, result: { details_0: { bucket: 500000 } } })).toEqual({ rank: null, bucket: 500000, kategoriler: [] });
    expect(parseRadarDomain({ success: true, result: { other: { bucket: ">200000" } } })!.bucket).toBe(200000);
  });
  it("tanınmayan biçim → null", () => {
    expect(parseRadarDomain(null)).toBeNull();
    expect(parseRadarDomain({ success: false })).toBeNull();
    expect(parseRadarDomain({ success: true, result: {} })).toBeNull();
    expect(parseRadarDomain({ success: true, result: { details_0: { rank: -1, bucket: "abc" } } })).toBeNull();
    expect(parseRadarDomain({ success: true, result: { details_0: { bucket: {} } } })).toBeNull();
    expect(parseRadarDomain({ success: true, result: { details_0: 5 } })).toBeNull();
  });
});
