/**
 * Kaynak: Chrome UX Report (CrUX) — chrome-ux-report.country_tr.* (experimental.popularity.rank)
 * Lisans seviyesi: public dataset (Google BigQuery public data)
 * Şartların okunduğu tarih: OKUNMADI — bu dosya ağ erişimi olmayan bir oturumda yazıldı.
 *   Proje sahibi CrUX lisans/atıf şartlarını (developer.chrome.com/docs/crux) okuyup tarihi
 *   aşağıdaki LISANS.sartlarOkunduTarihi alanına yazana kadar provider production'da KAPALI.
 * Public sayfada gösterilebilir: evet (şartlar okununca teyit edilecek)
 * Bulk CSV export'a dahil: evet — yalnızca kova etiketi (şartlar okununca teyit edilecek)
 *
 * Mimari (§4.2a): her istekte BigQuery'ye gidilmez. Ayda bir cron ingest eder, site Postgres'ten okur.
 * BigQuery erişimi KİŞİSEL GCP projesiyle yapılır (§0) — ajans projesi/servis hesabı kullanılmaz.
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { domainOrigins, domainSnapshots, domains } from "@/db/schema";
import { getDb } from "@/lib/db";
import { mergeOrigins, type OriginBucket } from "@/lib/envanter/domain";
import { bigQueryRows, gcpConfigured } from "./gcp";
import type { DomainSize, Lisans, SizeProvider } from "./types";

export const LISANS: Lisans = {
  kaynak: "Chrome UX Report (CrUX)",
  seviye: "public",
  lisansAdi: null, // doğrulanınca yaz
  sartlarOkunduTarihi: null,
  publicSayfadaGosterilebilir: true,
  bulkCsvExportaDahil: true,
  atif: "Chrome UX Report, Google",
  not: "Chrome kullanıcılarına ve navigasyona dayalıdır; Safari/iOS ağırlıklı siteler görece düşük görünebilir.",
};

export const crux: SizeProvider = {
  name: "crux",
  licenseLevel: "public",
  lisans: LISANS,
  async getDomain(domain) {
    const db = getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(domainSnapshots)
      .where(and(eq(domainSnapshots.domain, domain), eq(domainSnapshots.kaynak, "crux")))
      .orderBy(desc(domainSnapshots.yyyymm))
      .limit(1);
    if (!row) return null;
    return { domain, rankBucket: row.rankBucket, rank: null, kaynak: "crux", tarih: row.tarih, yyyymm: row.yyyymm, kapsamDisi: row.kapsamDisi };
  },
};

/** "202610" → bir önceki ay */
export function prevYyyymm(y: string): string {
  const yr = Number(y.slice(0, 4));
  const m = Number(y.slice(4));
  return m === 1 ? `${yr - 1}12` : `${yr}${String(m - 1).padStart(2, "0")}`;
}

/**
 * Aylık ingest: o ayın country_tr tablosu yoksa (CrUX takip eden ayın 2. Salı'sı yayınlanır)
 * bir önceki aya düşer. Domain bazında en iyi kova + alt alan adları ayrı satır.
 */
export async function ingestCrux(yyyymm: string, maxRank = Number(process.env.CRUX_MAX_RANK ?? 1_000_000)) {
  const db = getDb();
  if (!db || !gcpConfigured()) throw new Error("DATABASE_URL ve kişisel GCP kimlik bilgileri gerekli");
  const sql = `SELECT origin, experimental.popularity.rank AS rank
    FROM \`chrome-ux-report.country_tr.${yyyymm}\`
    WHERE experimental.popularity.rank <= @maxRank
    GROUP BY origin, rank`;
  const rows: OriginBucket[] = [];
  for await (const r of bigQueryRows(sql, { maxRank })) rows.push({ origin: String(r[0]), rank: Number(r[1]) });
  const merged = mergeOrigins(rows);
  const tarih = new Date().toISOString().slice(0, 10);
  const CHUNK = 2000;
  for (let i = 0; i < merged.length; i += CHUNK) {
    const part = merged.slice(i, i + CHUNK);
    await db.transaction(async (tx) => {
      await tx.insert(domains).values(part.map((m) => ({ domain: m.domain }))).onConflictDoNothing();
      await tx.insert(domainSnapshots).values(
        part.map((m) => ({ domain: m.domain, origin: null, yyyymm, tarih, rankBucket: m.rank, rank: null, kaynak: "crux", kapsamDisi: false })),
      );
      const subs = part.flatMap((m) =>
        m.origins.map((o) => ({ domain: m.domain, origin: o.origin, rankBucket: o.rank, altAlanAdi: o.altAlanAdi, kaynak: "crux", tarih })),
      );
      if (subs.length) await tx.insert(domainOrigins).values(subs).onConflictDoNothing();
    });
  }
  return { yyyymm, origin: rows.length, domain: merged.length };
}
