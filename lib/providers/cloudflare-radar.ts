/**
 * Kaynak: Cloudflare Radar API — domain ranking (api.cloudflare.com/client/v4/radar/ranking/domain/{domain})
 * Lisans seviyesi: public
 * Şartların okunduğu tarih: OKUNMADI — bu dosya ağ erişimi olmayan bir oturumda yazıldı.
 *   ⚠ Cloudflare Radar verisinin Creative Commons "NonCommercial" (CC BY-NC) bir lisansla
 *   yayımlandığı bilgisi var ama DOĞRULANMADI. Doğruysa, AdSense gösteren bir sitede kullanım
 *   ticari sayılabilir. Proje sahibi radar.cloudflare.com/about ve API şartlarını okuyup
 *   ticari kullanımın serbest olduğunu teyit etmeden LISANS.sartlarOkunduTarihi doldurulmamalı.
 *   Doldurulana kadar provider production'da KAPALI.
 * Public sayfada gösterilebilir: belirsiz (yukarıya bak)
 * Bulk CSV export'a dahil: hayır (şartlar netleşene kadar)
 *
 * Cache: domain_snapshots'ta 30 günden yeni kayıt varsa API'ye gidilmez (§M5).
 */
import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { domainSnapshots } from "@/db/schema";
import { getDb } from "@/lib/db";
import { parseRadarDomain } from "./cloudflare-parse";
import { providerEnabled, type DomainSize, type Lisans, type SizeProvider } from "./types";

export const LISANS: Lisans = {
  kaynak: "Cloudflare Radar",
  seviye: "public",
  lisansAdi: null,
  sartlarOkunduTarihi: null,
  publicSayfadaGosterilebilir: true,
  bulkCsvExportaDahil: false,
  atif: "Cloudflare Radar",
  not: "Ticari kullanım koşulları doğrulanmadı.",
};

const CACHE_GUN = 30;

async function fromCache(domain: string): Promise<DomainSize | null> {
  const db = getDb();
  if (!db) return null;
  const since = new Date(Date.now() - CACHE_GUN * 86_400_000).toISOString().slice(0, 10);
  const [row] = await db
    .select()
    .from(domainSnapshots)
    .where(and(eq(domainSnapshots.domain, domain), eq(domainSnapshots.kaynak, "cloudflare_radar"), gte(domainSnapshots.tarih, since)))
    .orderBy(desc(domainSnapshots.tarih))
    .limit(1);
  return row ? { domain, rankBucket: row.rankBucket, rank: row.rank, kaynak: "cloudflare_radar", tarih: row.tarih, kapsamDisi: row.kapsamDisi } : null;
}

export const cloudflareRadar: SizeProvider = {
  name: "cloudflare_radar",
  licenseLevel: "public",
  lisans: LISANS,
  async getDomain(domain) {
    const cached = await fromCache(domain);
    if (cached) return cached;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!token || !providerEnabled(LISANS)) return null;
    let parsed;
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/radar/ranking/domain/${encodeURIComponent(domain)}`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      if (res.status === 404) parsed = null;
      else if (!res.ok) return null;
      else parsed = parseRadarDomain(await res.json());
    } catch {
      return null;
    }
    const tarih = new Date().toISOString().slice(0, 10);
    const out: DomainSize = {
      domain,
      rankBucket: parsed?.bucket ?? null,
      rank: parsed?.rank ?? null,
      kaynak: "cloudflare_radar",
      tarih,
      kapsamDisi: !parsed,
      kategoriler: parsed?.kategoriler,
    };
    const db = getDb();
    if (db) {
      await db.insert(domainSnapshots).values({ domain, tarih, rankBucket: out.rankBucket, rank: out.rank, kaynak: "cloudflare_radar", kapsamDisi: out.kapsamDisi });
    }
    return out;
  },
};
