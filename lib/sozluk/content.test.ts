/** content/sozluk/*.mdx bütünlük testi: şema, zorunlu terimler (§M1), çapraz referanslar. */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { TOOLS } from "../calc/tools";
import { slugify } from "./normalize";
import { extractTanim, frontmatterSchema } from "./schema";

const DIR = path.join(process.cwd(), "content", "sozluk");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
const terms = files.map((f) => {
  const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
  return { file: f, slug: f.replace(/\.mdx$/, ""), data, content };
});
const slugs = new Set(terms.map((t) => t.slug));

// §M1 — ilk partide mutlaka olacak terimler
const ZORUNLU = [
  "DSP", "SSP", "Ad Exchange", "Ad Server", "DMP", "CDP", "CMP", "RTB", "OpenRTB", "Header Bidding", "Prebid", "Waterfall",
  "PMP", "PG", "Preferred Deal", "Open Auction", "First Price Auction", "Second Price Auction", "Bid Shading", "Floor Price",
  "Deal ID", "VAST", "VPAID", "VMAP", "SIMID", "MRAID", "CTV", "OTT", "DOOH", "Viewability", "MRC Standardı", "IVT", "GIVT",
  "SIVT", "Brand Safety", "Brand Suitability", "Ad Fraud", "Domain Spoofing", "ads.txt", "app-ads.txt", "sellers.json",
  "SupplyChain Object", "SPO", "MFA", "Cookie", "Cookieless", "Privacy Sandbox", "Topics API", "UID2", "ID5", "RampID",
  "Consent Mode", "GDPR", "KVKK", "Lookalike", "Retargeting", "Prospecting", "Frequency Capping", "Incremental Reach",
  "Reach Curve", "eCPM", "CPCV", "VTR", "VCR", "CTR", "CPA", "ROAS", "Attribution", "MTA", "MMM", "Incrementality",
  "Lift Test", "Brand Lift", "MMP", "Postback", "S2S", "Pixel", "Clean Room", "AMC", "Data Clean Room", "Curation",
  "Retail Media", "Commerce Media", "Audio Programmatic",
];

describe("sözlük içeriği", () => {
  it("en az 150 terim", () => expect(terms.length).toBeGreaterThanOrEqual(150));

  it("§M1 zorunlu terimlerin hepsi var", () => {
    expect(ZORUNLU.filter((t) => !slugs.has(slugify(t)))).toEqual([]);
  });

  it.each(terms.map((t) => [t.file, t] as const))("%s geçerli", (_, t) => {
    const fm = frontmatterSchema.safeParse(t.data);
    expect(fm.success, fm.success ? "" : fm.error.message).toBe(true);
    expect(t.slug).toBe(slugify(t.data.terim));
    expect(extractTanim(t.content)).toBeTruthy();
    for (const h of ["## İnsan gibi anlat", "## Günlük işte nerede karşına çıkar", "## Sık yapılan karışıklık"]) {
      expect(t.content).toContain(h);
    }
    // ham HTML md modunda kaybolur — açılı parantez kod içinde olmalı
    expect(t.content.replace(/`[^`]*`/g, "")).not.toMatch(/<[a-z/]/i);
  });

  it("tüm 'ilgili' referansları çözülüyor", () => {
    const broken = terms.flatMap((t) => (t.data.ilgili as string[]).filter((n) => !slugs.has(slugify(n))).map((n) => `${t.slug} → ${n}`));
    expect(broken).toEqual([]);
  });

  it("hesaplayıcıların bağlandığı terimler var", () => {
    expect(TOOLS.flatMap((t) => t.terimler).filter((s) => !slugs.has(s))).toEqual([]);
  });
});

describe("extractTanim", () => {
  it("bölüm yoksa null, boşsa null", () => {
    expect(extractTanim("## Başka\n\nmetin")).toBeNull();
    expect(extractTanim("## Tek cümlede\n\n")).toBeNull();
    expect(extractTanim("## Tek cümlede\n\nTanım burada.\n\n## Sonraki")).toBe("Tanım burada.");
  });
});
