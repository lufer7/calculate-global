/**
 * Temel programatik metrik formülleri. Saf fonksiyonlar, React bağımlılığı yok.
 *
 * Ortak sözleşme: geçersiz girdi (NaN, sonsuz, negatif) veya sıfıra bölme → null.
 * Sonuçlar YUVARLANMAZ; yuvarlama yalnızca gösterim katmanında (number.ts) yapılır.
 *
 * Kaynak: formüller IAB / MRC sözlüğündeki standart tanımlardır. Her formülün
 * varsayımları lib/calc/tools.ts içindeki araç tanımlarında açıkça yazılıdır.
 */

function valid(...xs: number[]): boolean {
  return xs.every((x) => Number.isFinite(x) && x >= 0);
}

/** a / b × k — paydanın sıfır olduğu durumda null. */
export function ratio(a: number, b: number, k = 1): number | null {
  if (!valid(a, b) || !Number.isFinite(k) || k <= 0 || b === 0) return null;
  return (a / b) * k;
}

/** CPM = (maliyet / impression) × 1000 */
export const cpm = (maliyet: number, impression: number) => ratio(maliyet, impression, 1000);
/** Impression = (bütçe / CPM) × 1000 */
export const impressionFromCpm = (butce: number, cpmDegeri: number) => ratio(butce, cpmDegeri, 1000);
/** Bütçe = (impression / 1000) × CPM */
export function budgetFromCpm(impression: number, cpmDegeri: number): number | null {
  if (!valid(impression, cpmDegeri)) return null;
  return (impression / 1000) * cpmDegeri;
}
/** eCPM = (toplam gelir veya maliyet / toplam impression) × 1000 */
export const ecpm = (tutar: number, impression: number) => ratio(tutar, impression, 1000);
/** CPC = maliyet / klik */
export const cpc = (maliyet: number, klik: number) => ratio(maliyet, klik);
/** CTR (%) = klik / impression × 100 */
export const ctr = (klik: number, impression: number) => ratio(klik, impression, 100);
/** CPV = maliyet / izlenme */
export const cpv = (maliyet: number, izlenme: number) => ratio(maliyet, izlenme);
/** CPCV = maliyet / tamamlanan izlenme */
export const cpcv = (maliyet: number, tamamlanan: number) => ratio(maliyet, tamamlanan);
/** VTR (%) = izlenme / impression × 100 */
export const vtr = (izlenme: number, impression: number) => ratio(izlenme, impression, 100);
/** VCR (%) = tamamlanan izlenme / impression × 100 */
export const vcr = (tamamlanan: number, impression: number) => ratio(tamamlanan, impression, 100);
/** Viewability (%) = görülebilir impression / ölçülen impression × 100 */
export const viewability = (gorulebilir: number, olculen: number) => ratio(gorulebilir, olculen, 100);
/** vCPM = (maliyet / görülebilir impression) × 1000 */
export const vcpm = (maliyet: number, gorulebilir: number) => ratio(maliyet, gorulebilir, 1000);
/** CPA = maliyet / dönüşüm */
export const cpa = (maliyet: number, donusum: number) => ratio(maliyet, donusum);
