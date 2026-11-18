/**
 * Kullanıcının DSP'sinden export ettiği segment listesini (CSV/XLSX satırları) standart biçime çevirir.
 * Saf fonksiyonlar; tarayıcıda çalışır. Dosya sunucuda saklanmaz.
 */
import { parseTrNumber } from "@/lib/calc/number";
import { trNormalize } from "@/lib/sozluk/normalize";

export type Dsp = "adform" | "amazon" | "dv360";
export const DSP_AD: Record<Dsp, string> = { adform: "Adform", amazon: "Amazon DSP", dv360: "DV360" };

export type Segment = {
  id: string; // listeye özel kısa kimlik (s1, s2, ...) — modele bu verilir
  ad: string;
  saglayici: string | null;
  cpmTl: number | null;
  reach: string | null; // sayı ya da metin (UID/Reach) — olduğu gibi korunur
  audienceId: string | null;
};

export type ColumnMap = { ad: number; saglayici: number; cpm: number; reach: number; audienceId: number };

const CANDIDATES: Record<keyof ColumnMap, string[]> = {
  ad: ["segment name", "audience name", "segment", "audience", "kitle adi", "kitle", "name", "ad"],
  saglayici: ["data provider", "provider", "saglayici", "category", "kategori", "vendor", "source"],
  cpm: ["cpm", "cpm-fee", "fee", "price", "fiyat", "cost"],
  reach: ["uid", "reach", "size", "users", "audience size", "unique", "erisim"],
  audienceId: ["audience id", "segment id", "id"],
};

export function detectColumns(header: string[]): ColumnMap {
  const h = header.map((x) => trNormalize(x));
  const used = new Set<number>();
  const find = (key: keyof ColumnMap): number => {
    for (const c of CANDIDATES[key]) {
      const i = h.findIndex((x, idx) => !used.has(idx) && x === c);
      if (i !== -1) return i;
    }
    for (const c of CANDIDATES[key]) {
      const i = h.findIndex((x, idx) => !used.has(idx) && x.includes(c));
      if (i !== -1) return i;
    }
    return -1;
  };
  const out = {} as ColumnMap;
  // id en sona: "audience name" gibi kolonlar önce eşlensin
  for (const k of ["ad", "saglayici", "cpm", "reach", "audienceId"] as const) {
    out[k] = find(k);
    if (out[k] !== -1) used.add(out[k]);
  }
  return out;
}

export function toSegments(rows: string[][], map: ColumnMap, limit = 5000): Segment[] {
  if (map.ad < 0) return [];
  const out: Segment[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const ad = (r[map.ad] ?? "").trim();
    if (!ad) continue;
    const saglayici = map.saglayici >= 0 ? (r[map.saglayici] ?? "").trim() || null : null;
    const key = `${ad}|${saglayici ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cpmRaw = map.cpm >= 0 ? r[map.cpm] ?? "" : "";
    const cpm = parseTrNumber(cpmRaw);
    out.push({
      id: `s${out.length + 1}`,
      ad,
      saglayici,
      cpmTl: cpm !== null && cpm >= 0 ? cpm : null,
      reach: map.reach >= 0 ? (r[map.reach] ?? "").trim() || null : null,
      audienceId: map.audienceId >= 0 ? (r[map.audienceId] ?? "").trim() || null : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
