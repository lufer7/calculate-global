import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { parse as tld } from "tldts";
import { crawlLog, domainAdstxt } from "@/db/schema";
import { getDb } from "@/lib/db";
import { BOT_UA, safeFetch } from "@/lib/net/safe-fetch";
import { extractMeta } from "@/lib/envanter/meta";
import { parseAdsTxt, type AdsTxtRecord, type AdsTxtResult } from "./parse";
import { isAllowed } from "./robots";
import { indexSellers, parseSellersJson, verifyRecord, type Dogrulama, type Seller } from "./sellers";

/**
 * ads.txt / sellers.json crawler (§4.2c crawl etiği):
 * - User-Agent: site adı + iletişim URL'i
 * - robots.txt'e uyulur
 * - host başına günde EN FAZLA bir istek (crawl_log ile; DB yoksa bellek içi)
 * - boyut ve süre sınırı, yalnızca aynı kök domain içinde yönlendirme
 */

const DAY = 86_400_000;
const memLog = new Map<string, number>(); // DB yokken: host|tip → son istek zamanı

async function recentlyCrawled(host: string, tip: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    const t = memLog.get(`${host}|${tip}`);
    return t !== undefined && Date.now() - t < DAY;
  }
  const rows = await db
    .select({ id: crawlLog.id })
    .from(crawlLog)
    .where(and(eq(crawlLog.host, host), eq(crawlLog.tip, tip), gte(crawlLog.tarih, new Date(Date.now() - DAY))))
    .limit(1);
  return rows.length > 0;
}

async function log(host: string, tip: string, durum: string, http: number | null, mesaj?: string) {
  memLog.set(`${host}|${tip}`, Date.now());
  const db = getDb();
  if (db) await db.insert(crawlLog).values({ host, tip, durum, http, mesaj: mesaj?.slice(0, 300) ?? null });
}

const sameRoot = (root: string) => (host: string) => tld(host).domain === root;

type RobotsKarar = "izin" | "yasak" | "ulasilamadi";

async function robotsCheck(host: string, path: string, root: string): Promise<RobotsKarar> {
  const r = await safeFetch(`https://${host}/robots.txt`, { maxBytes: 512_000, timeoutMs: 5000, allowRedirect: sameRoot(root) });
  // RFC 9309: 4xx → kısıt yok; 5xx / ulaşılamıyor → tarama yapılmaz (temkinli)
  if (!r.ok) {
    if (r.status !== null && r.status >= 400 && r.status < 500) return "izin";
    return r.status !== null && r.status >= 500 ? "yasak" : "ulasilamadi";
  }
  return isAllowed(r.body, BOT_UA, path) ? "izin" : "yasak";
}

export type CrawlSonuc =
  | { durum: "ok"; sonuc: AdsTxtResult; url: string }
  | { durum: "yok" | "robots_engelledi" | "hata" | "bekle"; mesaj: string };

/** Bir domain'in ads.txt'ini çeker (günde bir kez). `bekle` = 24 saat dolmadı. */
export async function fetchAdsTxt(domain: string, force = false): Promise<CrawlSonuc> {
  if (!force && (await recentlyCrawled(domain, "adstxt"))) return { durum: "bekle", mesaj: "bu domain son 24 saatte tarandı" };
  const robots = await robotsCheck(domain, "/ads.txt", domain);
  if (robots === "ulasilamadi") {
    await log(domain, "adstxt", "hata", null, "site ulaşılamadı");
    return { durum: "hata", mesaj: "site ulaşılamadı (DNS/ağ hatası)" };
  }
  if (robots === "yasak") {
    await log(domain, "adstxt", "robots_engelledi", null);
    return { durum: "robots_engelledi", mesaj: "robots.txt ads.txt erişimine izin vermiyor" };
  }
  for (const host of [domain, `www.${domain}`]) {
    const r = await safeFetch(`https://${host}/ads.txt`, { maxBytes: 2_000_000, timeoutMs: 8000, allowRedirect: sameRoot(domain) });
    if (!r.ok) continue;
    // Birçok site olmayan sayfa için HTML döndürür (soft 404)
    if (/text\/html/i.test(r.contentType) || /^\s*<(!doctype|html)/i.test(r.body)) continue;
    const sonuc = parseAdsTxt(r.body);
    await log(domain, "adstxt", sonuc.kayitlar.length ? "ok" : "yok", r.status);
    return { durum: "ok", sonuc, url: r.finalUrl };
  }
  await log(domain, "adstxt", "yok", null);
  return { durum: "yok", mesaj: "ads.txt bulunamadı" };
}

const sellersCache = new Map<string, { at: number; sellers: Map<string, Seller> | null }>();

/** SSP'nin sellers.json'ı (günde bir kez, bellek önbelleği). Bulunamazsa null. */
export async function fetchSellers(ssp: string): Promise<Map<string, Seller> | null> {
  const c = sellersCache.get(ssp);
  if (c && Date.now() - c.at < DAY) return c.sellers;
  if (await recentlyCrawled(ssp, "sellers")) return c?.sellers ?? null;
  const root = tld(ssp).domain ?? ssp;
  let sellers: Map<string, Seller> | null = null;
  if ((await robotsCheck(ssp, "/sellers.json", root)) === "izin") {
    const r = await safeFetch(`https://${ssp}/sellers.json`, { maxBytes: 40_000_000, timeoutMs: 15000, allowRedirect: () => true });
    if (r.ok) {
      try {
        const list = parseSellersJson(JSON.parse(r.body));
        sellers = list ? indexSellers(list) : null;
      } catch {
        sellers = null;
      }
    }
    await log(ssp, "sellers", sellers ? "ok" : r.ok ? "hata" : r.neden === "cok_buyuk" ? "cok_buyuk" : "yok", r.status, r.ok ? undefined : r.neden);
  } else {
    await log(ssp, "sellers", "robots_engelledi", null);
  }
  sellersCache.set(ssp, { at: Date.now(), sellers });
  return sellers;
}

export type DogrulanmisKayit = AdsTxtRecord & { dogrulama: Dogrulama | "sellers_json_yok"; sellerType: string | null; sellerName: string | null };

export async function verifyAll(domain: string, kayitlar: AdsTxtRecord[], maxSsp = 12): Promise<DogrulanmisKayit[]> {
  const ssps = [...new Set(kayitlar.map((k) => k.ssp))].slice(0, maxSsp);
  const maps = new Map<string, Map<string, Seller> | null>();
  await Promise.all(ssps.map(async (s) => maps.set(s, await fetchSellers(s))));
  return kayitlar.map((k) => {
    const m = maps.get(k.ssp);
    if (!m) return { ...k, dogrulama: "sellers_json_yok", sellerType: null, sellerName: null };
    const s = m.get(k.sellerId);
    return { ...k, dogrulama: verifyRecord(k, m, domain), sellerType: s?.sellerType ?? null, sellerName: s && !s.gizli ? s.name : null };
  });
}

/** Crawl + doğrulama + DB'ye yaz (önceki satırlar değiştirilir). */
export async function crawlAndStore(domain: string, opts: { force?: boolean; maxSsp?: number } = {}): Promise<CrawlSonuc> {
  const r = await fetchAdsTxt(domain, opts.force);
  if (r.durum !== "ok") return r;
  const db = getDb();
  if (db) {
    const verified = await verifyAll(domain, r.sonuc.kayitlar, opts.maxSsp);
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.delete(domainAdstxt).where(eq(domainAdstxt.domain, domain));
      if (verified.length) {
        await tx.insert(domainAdstxt).values(
          verified.map((v) => ({
            domain,
            ssp: v.ssp,
            sellerId: v.sellerId,
            iliski: v.iliski,
            tagId: v.certId,
            sellersJsonDogrulandi: v.dogrulama === "sellers_json_yok" ? null : v.dogrulama === "dogrulandi",
            dogrulama: v.dogrulama,
            sellerType: v.sellerType,
            sellerName: v.sellerName,
            cekilmeTarihi: now,
          })),
        );
      }
    });
  }
  return r;
}

/** Kategori sınıflandırması için ana sayfanın yalnızca title/meta description'ı (günde bir, robots'a uyarak). */
export async function fetchHomepageMeta(domain: string): Promise<{ title: string | null; description: string | null } | null> {
  if (await recentlyCrawled(domain, "homepage")) return null;
  if ((await robotsCheck(domain, "/", domain)) !== "izin") {
    await log(domain, "homepage", "robots_engelledi", null);
    return null;
  }
  const r = await safeFetch(`https://${domain}/`, { maxBytes: 1_500_000, timeoutMs: 8000, allowRedirect: sameRoot(domain) });
  await log(domain, "homepage", r.ok ? "ok" : "hata", r.status);
  return r.ok ? extractMeta(r.body) : null;
}
