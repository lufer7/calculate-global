/**
 * Katman B — Topluluk CPM verisi (§4.1). P0'da veri toplanmıyor ama
 * geçiş kuralı ŞİMDİDEN koda bağlı: sonra karar verilmez, eşik değiştirilir.
 */

export type CommunitySettings = {
  minGirdi: number; // birincil kaynak olmak için (varsayılan 8)
  minKatkici: number; // birincil kaynak olmak için (varsayılan 5)
  minGosterim: number; // hücreyi hiç göstermek için (varsayılan 5)
  pencereGun: number; // varsayılan 90
};

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  minGirdi: 8,
  minKatkici: 5,
  minGosterim: 5,
  pencereGun: 90,
};

export type Submission = { cpm: number; kullanici: string; tarih: Date };

/** Doğrusal enterpolasyonlu yüzdelik (R type 7 / Excel PERCENTILE.INC). */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const a = sorted[lo]!;
  const b = sorted[hi]!;
  return a + (b - a) * (idx - lo);
}

/** IQR dışı değerleri işaretler (Q1 − 1,5·IQR, Q3 + 1,5·IQR). */
export function iqrOutliers(values: number[]): boolean[] {
  const s = [...values].sort((x, y) => x - y);
  const q1 = percentile(s, 0.25);
  const q3 = percentile(s, 0.75);
  const iqr = q3 - q1;
  return values.map((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
}

export type CommunityCell = {
  girdi: number;
  katkici: number;
  medyan: number;
  p25: number;
  p75: number;
  birincil: boolean; // topluluk medyanı benchmark'ın önüne geçti mi
};

export function communityCell(
  subs: Submission[],
  now: Date,
  settings: CommunitySettings = DEFAULT_COMMUNITY_SETTINGS,
): CommunityCell | null {
  const since = now.getTime() - settings.pencereGun * 86_400_000;
  const recent = subs.filter((s) => s.tarih.getTime() >= since && Number.isFinite(s.cpm) && s.cpm > 0);
  const flags = iqrOutliers(recent.map((s) => s.cpm));
  const clean = recent.filter((_, i) => !flags[i]);
  if (clean.length < settings.minGosterim) return null;

  const sorted = clean.map((s) => s.cpm).sort((a, b) => a - b);
  const katkici = new Set(clean.map((s) => s.kullanici)).size;
  return {
    girdi: clean.length,
    katkici,
    medyan: percentile(sorted, 0.5),
    p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75),
    birincil: clean.length >= settings.minGirdi && katkici >= settings.minKatkici,
  };
}
