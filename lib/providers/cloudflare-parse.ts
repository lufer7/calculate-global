/**
 * Cloudflare Radar domain ranking yanıtının savunmacı ayrıştırılması.
 * DİKKAT: yanıt biçimi bu oturumda resmî dokümandan doğrulanamadı; beklenen alanlar yoksa null döner.
 * Beklenen: { success: true, result: { details_0: { rank?: number, bucket?: string|number, categories?: [{name}] } } }
 */
export type RadarParsed = { rank: number | null; bucket: number | null; kategoriler: string[] };

function toBucket(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function parseRadarDomain(json: unknown): RadarParsed | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { success?: unknown; result?: Record<string, unknown> };
  if (o.success !== true || !o.result || typeof o.result !== "object") return null;
  const d = (o.result.details_0 ?? Object.values(o.result)[0]) as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") return null;
  const rank = typeof d.rank === "number" && d.rank > 0 ? d.rank : null;
  const bucket = toBucket(d.bucket);
  const kategoriler = Array.isArray(d.categories)
    ? d.categories.map((c) => (c && typeof c === "object" && typeof (c as { name?: unknown }).name === "string" ? (c as { name: string }).name : null)).filter((x): x is string => !!x)
    : [];
  if (rank === null && bucket === null) return null;
  return { rank, bucket, kategoriler };
}
