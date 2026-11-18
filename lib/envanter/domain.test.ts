import { describe, expect, it } from "vitest";
import { cruxLabel, hostsOf, mergeOrigins, normalizeHost, sortByBuckets } from "./domain";

describe("normalizeHost", () => {
  it.each([
    ["https://www.ornek.com", "ornek.com", "ornek.com", false],
    ["http://ornek.com/", "ornek.com", "ornek.com", false],
    ["ORNEK.com", "ornek.com", "ornek.com", false],
    ["https://spor.ornek.com.tr:443/x", "ornek.com.tr", "spor.ornek.com.tr", true],
    ["www2.haber.gov.tr", "haber.gov.tr", "haber.gov.tr", false],
    ["https://m.ornek.co.uk", "ornek.co.uk", "m.ornek.co.uk", true],
    ["ornek.com.", "ornek.com", "ornek.com", false],
  ])("%s", (input, domain, host, alt) => {
    expect(normalizeHost(input)).toEqual({ domain, host, altAlanAdi: alt });
  });
  it.each([[""], ["   "], ["http://"], ["localhost"], ["192.168.1.1"], ["com.tr"], ["http://[::1"]])("%s → null", (i) => {
    expect(normalizeHost(i)).toBeNull();
  });
});

describe("mergeOrigins", () => {
  const m = mergeOrigins([
    { origin: "https://www.ornek.com", rank: 10_000 },
    { origin: "https://ornek.com", rank: 1_000 },
    { origin: "http://ornek.com", rank: 100_000 },
    { origin: "https://spor.ornek.com", rank: 100_000 },
    { origin: "https://baska.com.tr", rank: 1_000 },
    { origin: "https://localhost", rank: 1000 },
    { origin: "https://x.com", rank: 0 },
  ]);
  it("en iyi kova, kova + alfabetik sıra", () => {
    expect(m.map((x) => [x.domain, x.rank])).toEqual([
      ["baska.com.tr", 1_000],
      ["ornek.com", 1_000],
    ]);
    expect(m[1]!.origins).toHaveLength(4);
  });
  it("hostsOf: host başına en iyi kova, ana domain önce", () => {
    expect(hostsOf(m[1]!)).toEqual([
      { host: "ornek.com", rank: 1_000, altAlanAdi: false },
      { host: "spor.ornek.com", rank: 100_000, altAlanAdi: true },
    ]);
  });
  it("hostsOf: aynı kova ve tipte alfabetik", () => {
    const x = mergeOrigins([
      { origin: "https://b.ornek.com", rank: 1000 },
      { origin: "https://a.ornek.com", rank: 1000 },
    ]);
    expect(hostsOf(x[0]!).map((h) => h.host)).toEqual(["a.ornek.com", "b.ornek.com"]);
  });
});

describe("cruxLabel", () => {
  it("kovalar", () => {
    expect(cruxLabel(1000).etiket).toBe("Türkiye'de ilk 1.000");
    expect(cruxLabel(10_000).kademe).toBe("Büyük — planın gövdesi");
    expect(cruxLabel(1_000_000).etiket).toBe("Türkiye'de ilk 1.000.000");
    expect(cruxLabel(null).kademe).toBe("Ölçülemiyor");
    expect(cruxLabel(5_000_000).etiket).toContain("kapsamında değil");
  });
});

describe("sortByBuckets", () => {
  it("CrUX → Cloudflare → alfabetik; null en sonda", () => {
    const s = sortByBuckets([
      { domain: "c.com", cruxRank: 10_000, cfRank: 500 },
      { domain: "b.com", cruxRank: 10_000, cfRank: 200 },
      { domain: "a.com", cruxRank: 10_000, cfRank: 200 },
      { domain: "z.com", cruxRank: 1000, cfRank: null },
      { domain: "y.com", cruxRank: null, cfRank: 100 },
    ]);
    expect(s.map((x) => x.domain)).toEqual(["z.com", "a.com", "b.com", "c.com", "y.com"]);
  });
});
