/**
 * Origin → domain normalizasyonu ve kova birleştirme (§4.2a madde 1).
 * CrUX origin bazlıdır: https://www.ornek.com, https://ornek.com, http://ornek.com ayrı gelir.
 * Şema ve www. atılır, eTLD+1'e indirilir (Public Suffix List — tldts), en iyi (en küçük) kova alınır.
 * Alt alan adları ayrı tutulur ama domain sayfasında birlikte listelenir.
 */
import { parse } from "tldts";

export type NormalOrigin = { domain: string; host: string; altAlanAdi: boolean };

/** Kullanıcı girdisi ya da origin → normalize. Geçersizse null. */
export function normalizeHost(input: string): NormalOrigin | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z]+:\/\//.test(s)) s = `https://${s}`;
  let host: string;
  try {
    host = new URL(s).hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, "").replace(/^www\d*\./, "");
  const p = parse(host, { allowPrivateDomains: false });
  if (!p.domain || !p.isIcann || p.isIp) return null;
  return { domain: p.domain, host, altAlanAdi: host !== p.domain };
}

export type OriginBucket = { origin: string; rank: number };
export type MergedDomain = {
  domain: string;
  rank: number; // en iyi kova (en küçük)
  origins: { origin: string; host: string; rank: number; altAlanAdi: boolean }[];
};

export function mergeOrigins(rows: OriginBucket[]): MergedDomain[] {
  const by = new Map<string, MergedDomain>();
  for (const r of rows) {
    const n = normalizeHost(r.origin);
    if (!n || !(r.rank > 0)) continue;
    const e = by.get(n.domain) ?? { domain: n.domain, rank: Infinity, origins: [] };
    e.rank = Math.min(e.rank, r.rank);
    e.origins.push({ origin: r.origin, host: n.host, rank: r.rank, altAlanAdi: n.altAlanAdi });
    by.set(n.domain, e);
  }
  return [...by.values()].sort((a, b) => a.rank - b.rank || a.domain.localeCompare(b.domain));
}

/** Aynı host'un (www/şema farkı) birden çok origin'ini tek satıra indirir — host başına en iyi kova. */
export function hostsOf(m: MergedDomain): { host: string; rank: number; altAlanAdi: boolean }[] {
  const by = new Map<string, { host: string; rank: number; altAlanAdi: boolean }>();
  for (const o of m.origins) {
    const e = by.get(o.host);
    if (!e || o.rank < e.rank) by.set(o.host, { host: o.host, rank: o.rank, altAlanAdi: o.altAlanAdi });
  }
  return [...by.values()].sort((a, b) => Number(a.altAlanAdi) - Number(b.altAlanAdi) || a.rank - b.rank || a.host.localeCompare(b.host));
}

/** §4.2a kova tablosu */
export const CRUX_KOVALAR: { kova: number; etiket: string; kademe: string }[] = [
  { kova: 1_000, etiket: "Türkiye'de ilk 1.000", kademe: "Çok büyük — ana mecra" },
  { kova: 10_000, etiket: "Türkiye'de ilk 10.000", kademe: "Büyük — planın gövdesi" },
  { kova: 100_000, etiket: "Türkiye'de ilk 100.000", kademe: "Orta — niş/destek" },
  { kova: 1_000_000, etiket: "Türkiye'de ilk 1.000.000", kademe: "Küçük — uzun kuyruk" },
];

export function cruxLabel(rank: number | null | undefined): { etiket: string; kademe: string } {
  if (rank == null) return { etiket: "CrUX kapsamında değil (Türkiye'de ilk 1M dışında)", kademe: "Ölçülemiyor" };
  const k = CRUX_KOVALAR.find((x) => rank <= x.kova);
  return k ? { etiket: k.etiket, kademe: k.kademe } : { etiket: "CrUX kapsamında değil (Türkiye'de ilk 1M dışında)", kademe: "Ölçülemiyor" };
}

export type SiralanabilirDomain = { domain: string; cruxRank: number | null; cfRank: number | null };

/**
 * Kategori sıralaması: CrUX kovası, sonra Cloudflare kovası; aynı kovadakiler alfabetik
 * (yapay kesinlik üretmemek için kova içi sıralama yapılmaz).
 */
export function sortByBuckets<T extends SiralanabilirDomain>(list: T[]): T[] {
  const k = (n: number | null) => (n == null ? Number.POSITIVE_INFINITY : n);
  return [...list].sort((a, b) => k(a.cruxRank) - k(b.cruxRank) || k(a.cfRank) - k(b.cfRank) || a.domain.localeCompare(b.domain, "tr"));
}
