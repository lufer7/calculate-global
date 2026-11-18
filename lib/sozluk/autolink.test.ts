import { describe, expect, it } from "vitest";
import { compileMatchers, linkify } from "./autolink";
import { slugify, trNormalize } from "./normalize";

describe("trNormalize / slugify", () => {
  it("Türkçe karakterler", () => {
    expect(trNormalize("İŞĞÜÖÇ ışğüöç")).toBe("isguoc isguoc");
    expect(trNormalize("  Görülebilirlik ")).toBe("gorulebilirlik");
    expect(trNormalize("café")).toBe("cafe");
  });
  it("slug", () => {
    expect(slugify("MRC Standardı")).toBe("mrc-standardi");
    expect(slugify("ads.txt")).toBe("ads-txt");
    expect(slugify("app-ads.txt")).toBe("app-ads-txt");
    expect(slugify("First / Second")).toBe("first-second");
    expect(slugify("eCPM")).toBe("ecpm");
  });
});

const matchers = compileMatchers([
  { slug: "ssp", names: ["SSP", "Supply Side Platform"], tanim: "satış platformu" },
  { slug: "dsp", names: ["DSP"], tanim: "alım platformu" },
  { slug: "pg", names: ["PG"], tanim: "garantili" },
  { slug: "clean-room", names: ["Clean Room"], tanim: "genel" },
  { slug: "data-clean-room", names: ["Data Clean Room"], tanim: "veri" },
  { slug: "ads-txt", names: ["ads.txt"], tanim: "yetkili satıcılar" },
  { slug: "x", names: ["a"], tanim: "çok kısa, atlanır" },
]);

const links = (segs: ReturnType<typeof linkify>) => segs.filter((s) => s.type === "link").map((s) => s.type === "link" && s.slug);

describe("linkify", () => {
  it("apostroflu Türkçe ekle eşleşir", () => {
    const s = linkify("SSP'ler DSP'nin karşısında durur.", matchers, new Set(), "self");
    expect(links(s)).toEqual(["ssp", "dsp"]);
    expect(s.map((x) => x.value).join("")).toBe("SSP'ler DSP'nin karşısında durur.");
  });
  it("kısaltmalar büyük/küçük harf duyarlı, kelime sınırı zorunlu", () => {
    expect(links(linkify("pg ve Pg ve PGX ve aPG", matchers, new Set(), "self"))).toEqual([]);
    expect(links(linkify("PG anlaşması", matchers, new Set(), "self"))).toEqual(["pg"]);
  });
  it("uzun ad önce", () => {
    expect(links(linkify("Data Clean Room kurduk", matchers, new Set(), "self"))).toEqual(["data-clean-room"]);
  });
  it("uzun adlar büyük/küçük harf duyarsız; noktalı adlar", () => {
    expect(links(linkify("bir supply side platform ve ADS.TXT dosyası", matchers, new Set(), "self"))).toEqual([
      "ssp",
      "ads-txt",
    ]);
  });
  it("terim başına tek link, kendine link yok", () => {
    const used = new Set<string>();
    expect(links(linkify("SSP SSP DSP", matchers, used, "dsp"))).toEqual(["ssp"]);
    expect(links(linkify("SSP tekrar", matchers, used, "dsp"))).toEqual([]);
  });
  it("metnin sonunda eşleşme", () => {
    const s = linkify("bunu yapan DSP", matchers, new Set(), "self");
    expect(s.at(-1)).toMatchObject({ type: "link", value: "DSP" });
  });
  it("eşleşme yoksa tek metin parçası", () => {
    expect(linkify("hiçbir şey", matchers, new Set(), "self")).toEqual([{ type: "text", value: "hiçbir şey" }]);
  });
});
