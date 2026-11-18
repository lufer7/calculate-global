import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { domainAdstxt, domainOrigins, domains, domainSnapshots } from "@/db/schema";
import { getDb } from "@/lib/db";
import { crawlAndStore, fetchAdsTxt, type CrawlSonuc } from "@/lib/adstxt/crawl";
import { summarizeAdsTxt, type AdsTxtOzet } from "@/lib/adstxt/parse";
import { cloudflareRadar, LISANS as CF } from "@/lib/providers/cloudflare-radar";
import { crux, LISANS as CRUX } from "@/lib/providers/crux";
import { providerEnabled, type DomainSize } from "@/lib/providers/types";
import { isEnvanterKategori, type EnvanterKategori } from "./kategoriler";

export type AdsTxtSatir = {
  ssp: string;
  sellerId: string;
  iliski: "DIRECT" | "RESELLER";
  dogrulama: string | null;
  sellerName: string | null;
};

export type DomainReport = {
  domain: string;
  dbVar: boolean;
  kategori: EnvanterKategori | null;
  kategoriKaynagi: string | null;
  crux: DomainSize | null;
  cruxAcik: boolean;
  cloudflare: DomainSize | null;
  cloudflareAcik: boolean;
  altAlanlar: { host: string; rank: number | null }[];
  adstxt: { ozet: AdsTxtOzet; satirlar: AdsTxtSatir[]; tarih: string; canli: boolean } | null;
  adstxtDurum: CrawlSonuc["durum"] | "kayit";
  adstxtMesaj: string | null;
};

const STALE_GUN = 7;

/** Domain sayfası verisi. ads.txt kaydı 7 günden eskiyse (ve son 24 saatte denenmediyse) yeniden taranır. */
export async function getDomainReport(domain: string): Promise<DomainReport> {
  const db = getDb();
  const cruxAcik = providerEnabled(CRUX);
  const cloudflareAcik = providerEnabled(CF);
  const base: DomainReport = {
    domain,
    dbVar: !!db,
    kategori: null,
    kategoriKaynagi: null,
    crux: null,
    cruxAcik,
    cloudflare: null,
    cloudflareAcik,
    altAlanlar: [],
    adstxt: null,
    adstxtDurum: "kayit",
    adstxtMesaj: null,
  };

  if (!db) {
    // DB yokken: canlı tarama (bellek içi günlük sınırıyla), sonuç saklanmaz
    const r = await fetchAdsTxt(domain);
    if (r.durum === "ok") {
      const ozet = summarizeAdsTxt(r.sonuc.kayitlar);
      return {
        ...base,
        adstxt: {
          ozet,
          satirlar: r.sonuc.kayitlar.map((k) => ({ ssp: k.ssp, sellerId: k.sellerId, iliski: k.iliski, dogrulama: null, sellerName: null })),
          tarih: new Date().toISOString(),
          canli: true,
        },
        adstxtDurum: "ok",
      };
    }
    return { ...base, adstxtDurum: r.durum, adstxtMesaj: r.mesaj };
  }

  const [dRow] = await db.select().from(domains).where(eq(domains.domain, domain)).limit(1);
  let rows = await db.select().from(domainAdstxt).where(eq(domainAdstxt.domain, domain));
  const lastAt = rows[0]?.cekilmeTarihi;
  let durum: DomainReport["adstxtDurum"] = "kayit";
  let mesaj: string | null = null;
  if (!lastAt || Date.now() - lastAt.getTime() > STALE_GUN * 86_400_000) {
    if (!dRow) await db.insert(domains).values({ domain }).onConflictDoNothing();
    const r = await crawlAndStore(domain, { maxSsp: 8 });
    durum = r.durum;
    mesaj = r.durum === "ok" ? null : r.mesaj;
    if (r.durum === "ok") rows = await db.select().from(domainAdstxt).where(eq(domainAdstxt.domain, domain));
  }

  const [cruxRow, cfRow, origins] = await Promise.all([
    cruxAcik ? crux.getDomain(domain).catch(() => null) : null,
    cloudflareAcik ? cloudflareRadar.getDomain(domain).catch(() => null) : null,
    db
      .select({ origin: domainOrigins.origin, rank: domainOrigins.rankBucket, alt: domainOrigins.altAlanAdi })
      .from(domainOrigins)
      .where(and(eq(domainOrigins.domain, domain), eq(domainOrigins.altAlanAdi, true)))
      .orderBy(asc(domainOrigins.rankBucket))
      .limit(30),
  ]);

  const hosts = new Map<string, number | null>();
  for (const o of origins) {
    const h = o.origin.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "");
    if (!hosts.has(h)) hosts.set(h, o.rank);
  }

  const kayitlar = rows.map((r) => ({ ssp: r.ssp, sellerId: r.sellerId, iliski: r.iliski as "DIRECT" | "RESELLER", certId: r.tagId, satir: 0 }));
  return {
    ...base,
    kategori: isEnvanterKategori(dRow?.kategori) ? dRow.kategori : null,
    kategoriKaynagi: dRow?.kategoriKaynagi ?? null,
    crux: cruxRow,
    cloudflare: cfRow,
    altAlanlar: [...hosts.entries()].map(([host, rank]) => ({ host, rank })),
    adstxt: rows.length
      ? {
          ozet: summarizeAdsTxt(kayitlar),
          satirlar: rows.map((r) => ({ ssp: r.ssp, sellerId: r.sellerId, iliski: r.iliski as "DIRECT" | "RESELLER", dogrulama: r.dogrulama, sellerName: r.sellerName })),
          tarih: rows[0]!.cekilmeTarihi.toISOString(),
          canli: false,
        }
      : null,
    adstxtDurum: rows.length ? "ok" : durum,
    adstxtMesaj: mesaj,
  };
}

export type KategoriSatir = {
  domain: string;
  kategori: EnvanterKategori;
  cruxRank: number | null;
  cfRank: number | null;
  sspSayisi: number;
  direct: number;
  reseller: number;
  ssp: string[];
};

/** Kategori sayfası + CSV için. Yalnız DB'den okur, ağ isteği yapmaz. */
export async function getCategoryRows(kategori: EnvanterKategori): Promise<KategoriSatir[] | null> {
  const db = getDb();
  if (!db) return null;
  const ds = await db.select().from(domains).where(eq(domains.kategori, kategori));
  if (ds.length === 0) return [];
  const names = ds.map((d) => d.domain);
  const [snaps, ads] = await Promise.all([
    db
      .select()
      .from(domainSnapshots)
      .where(inArray(domainSnapshots.domain, names))
      .orderBy(desc(domainSnapshots.tarih)),
    db.select().from(domainAdstxt).where(inArray(domainAdstxt.domain, names)),
  ]);
  return names.map((domain) => {
    const c = providerEnabled(CRUX) ? snaps.find((s) => s.domain === domain && s.kaynak === "crux") : undefined;
    const f = providerEnabled(CF) ? snaps.find((s) => s.domain === domain && s.kaynak === "cloudflare_radar") : undefined;
    const rows = ads.filter((a) => a.domain === domain);
    const ozet = summarizeAdsTxt(rows.map((r) => ({ ssp: r.ssp, sellerId: r.sellerId, iliski: r.iliski as "DIRECT" | "RESELLER", certId: null, satir: 0 })));
    return {
      domain,
      kategori,
      cruxRank: c?.rankBucket ?? null,
      cfRank: f?.rankBucket ?? null,
      sspSayisi: ozet.sspSayisi,
      direct: ozet.direct,
      reseller: ozet.reseller,
      ssp: ozet.ssp.map((s) => s.ssp),
    };
  });
}
