import { describe, expect, it } from "vitest";
import { parseAdsTxt, summarizeAdsTxt } from "./parse";
import { indexSellers, parseSellersJson, verifyRecord } from "./sellers";
import { isAllowed } from "./robots";

const SAMPLE = `\uFEFF# yorum satırı
google.com, pub-123, DIRECT, f08c47fec0942fa0
google.com, pub-123, DIRECT, f08c47fec0942fa0
Rubiconproject.com, 1001, RESELLER # satır sonu yorumu
pubmatic.com, 77, direct
pubmatic.com, 78, RESELLER, 5d62403b186f2ace
contact=reklam@ornek.com
OWNERDOMAIN=ornek.com
bogus=1
eksik.com, 5
gecersiz alan, 1, DIRECT
x.com, , DIRECT
y.com, 9, PARTNER
`;

describe("parseAdsTxt", () => {
  const r = parseAdsTxt(SAMPLE);
  it("geçerli kayıtlar, tekrar tek sayılır, ilişki büyük harfe çevrilir", () => {
    expect(r.kayitlar.map((k) => `${k.ssp}|${k.sellerId}|${k.iliski}`)).toEqual([
      "google.com|pub-123|DIRECT",
      "rubiconproject.com|1001|RESELLER",
      "pubmatic.com|77|DIRECT",
      "pubmatic.com|78|RESELLER",
    ]);
    expect(r.kayitlar[0]!.certId).toBe("f08c47fec0942fa0");
    expect(r.kayitlar[1]!.certId).toBeNull();
  });
  it("değişkenler", () => {
    expect(r.degiskenler).toEqual([
      { ad: "contact", deger: "reklam@ornek.com" },
      { ad: "ownerdomain", deger: "ornek.com" },
    ]);
  });
  it("hatalar", () => {
    expect(r.hatalar.map((h) => h.neden)).toEqual([
      "bilinmeyen değişken",
      "eksik alan",
      "geçersiz reklam sistemi alan adı",
      "boş satıcı kimliği",
      "ilişki DIRECT ya da RESELLER olmalı",
    ]);
  });
  it("boş dosya / CRLF", () => {
    expect(parseAdsTxt("").kayitlar).toEqual([]);
    expect(parseAdsTxt("a.com, 1, DIRECT\r\nb.com, 2, RESELLER\r").kayitlar).toHaveLength(2);
  });
});

describe("summarizeAdsTxt", () => {
  it("SSP bazında özet", () => {
    const s = summarizeAdsTxt(parseAdsTxt(SAMPLE).kayitlar);
    expect(s).toMatchObject({ sspSayisi: 3, seatSayisi: 4, direct: 2, reseller: 2 });
    expect(s.ssp[0]).toEqual({ ssp: "pubmatic.com", direct: 1, reseller: 1, seat: 2 });
    expect(s.ssp.map((x) => x.ssp)).toEqual(["pubmatic.com", "google.com", "rubiconproject.com"]);
  });
  it("eşitlikte alfabetik", () => {
    const s = summarizeAdsTxt(parseAdsTxt("b.com, 1, DIRECT\na.com, 1, DIRECT").kayitlar);
    expect(s.ssp.map((x) => x.ssp)).toEqual(["a.com", "b.com"]);
  });
});

describe("sellers.json", () => {
  const sellers = parseSellersJson({
    sellers: [
      { seller_id: "pub-123", seller_type: "PUBLISHER", name: "Örnek", domain: "Ornek.com" },
      { seller_id: 1001, seller_type: "intermediary", name: "Aracı" },
      { seller_id: "77", seller_type: "BOTH", domain: "baska.com" },
      { seller_id: "88", seller_type: "PUBLISHER", is_confidential: 1 },
      { seller_id: "99", seller_type: "PUBLISHER", domain: "ornek.com" },
      { seller_id: "x", seller_type: "WRONG" },
      { seller_id: "z", seller_type: 5 },
      null,
      { seller_type: "PUBLISHER" },
    ],
  })!;
  const idx = indexSellers(sellers);
  const rec = (ssp: string, sellerId: string, iliski: "DIRECT" | "RESELLER") => ({ ssp, sellerId, iliski, certId: null, satir: 1 });

  it("geçersiz kayıtlar atlanır", () => {
    expect(sellers.map((s) => s.sellerId)).toEqual(["pub-123", "1001", "77", "88", "99"]);
    expect(sellers[0]!.domain).toBe("ornek.com");
    expect(sellers[3]!.gizli).toBe(true);
  });
  it("geçersiz dosya → null", () => {
    expect(parseSellersJson(null)).toBeNull();
    expect(parseSellersJson({ sellers: "x" })).toBeNull();
  });
  it("doğrulama", () => {
    expect(verifyRecord(rec("g", "pub-123", "DIRECT"), idx, "ornek.com")).toBe("dogrulandi");
    expect(verifyRecord(rec("g", "pub-123", "DIRECT"), idx, "spor.ornek.com")).toBe("dogrulandi");
    expect(verifyRecord(rec("g", "pub-123", "DIRECT"), idx, "diger.com")).toBe("alan_adi_uyusmuyor");
    expect(verifyRecord(rec("g", "1001", "RESELLER"), idx, "ornek.com")).toBe("dogrulandi");
    expect(verifyRecord(rec("g", "1001", "DIRECT"), idx, "ornek.com")).toBe("tip_uyusmuyor");
    expect(verifyRecord(rec("g", "pub-123", "RESELLER"), idx, "ornek.com")).toBe("tip_uyusmuyor");
    expect(verifyRecord(rec("g", "77", "DIRECT"), idx, "ornek.com")).toBe("dogrulandi");
    expect(verifyRecord(rec("g", "88", "DIRECT"), idx, "ornek.com")).toBe("gizli");
    expect(verifyRecord(rec("g", "nope", "DIRECT"), idx, "ornek.com")).toBe("bulunamadi");
  });
});

describe("robots.txt", () => {
  const UA = "PRGTURK-adstxt-bot/1.0";
  it("kural yoksa serbest", () => expect(isAllowed("", UA, "/ads.txt")).toBe(true));
  it("daha uzun kural, sonraki kısa kurala karşı korunur", () =>
    expect(isAllowed("User-agent: *\nDisallow: /ads.txt\nAllow: /", UA, "/ads.txt")).toBe(false));
  it("* grubu", () => {
    expect(isAllowed("User-agent: *\nDisallow: /", UA, "/ads.txt")).toBe(false);
    expect(isAllowed("User-agent: *\nDisallow:", UA, "/ads.txt")).toBe(true);
    expect(isAllowed("User-agent: *\nDisallow: /\nAllow: /ads.txt", UA, "/ads.txt")).toBe(true);
    expect(isAllowed("User-agent: *\nDisallow: /*.txt$", UA, "/ads.txt")).toBe(false);
    expect(isAllowed("User-agent: *\nDisallow: /*.txt$", UA, "/ads.txt?x")).toBe(true);
  });
  it("kendi grubumuz *'ı ezer; birden çok agent satırı tek grup", () => {
    const txt = "User-agent: Googlebot\nUser-agent: prgturk-adstxt-bot\nAllow: /\n\nUser-agent: *\nDisallow: /";
    expect(isAllowed(txt, UA, "/ads.txt")).toBe(true);
    expect(isAllowed("User-agent: prgturk-adstxt-bot\nDisallow: /ads.txt\nUser-agent: *\nAllow: /", UA, "/ads.txt")).toBe(false);
  });
  it("eşit uzunlukta Allow kazanır; yorum ve bilinmeyen satırlar", () => {
    expect(isAllowed("User-agent: * # hepsi\nDisallow: /ads.txt\nAllow: /ads.txt\nCrawl-delay: 5\nfoo", UA, "/ads.txt")).toBe(true);
    expect(isAllowed("Disallow: /\nUser-agent: *\nSitemap: x\nDisallow: /b", UA, "/ads.txt")).toBe(true);
  });
});
