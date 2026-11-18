/**
 * CPM bant modeli — Katman A (§4.1).
 *
 * Kural 1: değer KAYNAK para biriminde saklanır, TL gösterim anında hesaplanır.
 *          TL değişimi ile kaynak para birimi değişimi AYRI raporlanır (kur etkisi ayrışsın).
 * Kural 2: Türkiye düzeltme katsayısı editöryel tahmindir; katsayı yoksa TL bandı YAYINLANMAZ.
 * Kural 3: tek sayı değil bant (min–max veya P25–P75).
 */

export type Currency = "USD" | "EUR" | "TRY";

export type BenchmarkPoint = {
  format: string;
  donem: string; // "YYYY-MM"
  paraBirimi: Currency;
  min: number; // kaynak para biriminde
  max: number;
  kurDegeri: number; // 1 birim kaynak para = kurDegeri TL (TRY için 1)
  kurTarihi: string;
  kurKaynagi: string;
  kaynakAdi: string;
};

export type Adjustment = { katsayi: number; metotNotu: string };

export type CpmBand = {
  format: string;
  donem: string;
  tlMin: number;
  tlMax: number;
  tlOrta: number;
  kaynakOrta: number;
  degisimTl: number | null; // % — kur etkisi dahil
  degisimKaynak: number | null; // % — kaynak para biriminde, kur etkisi hariç
  paraBirimi: Currency;
  kurDegeri: number;
  kurTarihi: string;
  kurKaynagi: string;
  kaynakAdi: string;
  katsayi: number;
  metotNotu: string;
};

function pointValid(p: BenchmarkPoint): boolean {
  return (
    [p.min, p.max, p.kurDegeri].every((n) => Number.isFinite(n) && n > 0) && p.max >= p.min
  );
}

export const mid = (min: number, max: number) => (min + max) / 2;

export function pctChange(now: number, prev: number): number | null {
  if (!Number.isFinite(now) || !Number.isFinite(prev) || prev === 0) return null;
  return (now / prev - 1) * 100;
}

/** Kaynak değeri TL'ye çevirip Türkiye katsayısını uygular. */
export function toTl(value: number, kurDegeri: number, katsayi: number): number {
  return value * kurDegeri * katsayi;
}

export function computeBand(
  current: BenchmarkPoint,
  previous: BenchmarkPoint | null,
  adj: Adjustment | null,
): CpmBand | null {
  if (!adj || !(adj.katsayi > 0) || adj.metotNotu.trim() === "") return null;
  if (!pointValid(current)) return null;

  const tlMin = toTl(current.min, current.kurDegeri, adj.katsayi);
  const tlMax = toTl(current.max, current.kurDegeri, adj.katsayi);
  const kaynakOrta = mid(current.min, current.max);
  const tlOrta = mid(tlMin, tlMax);

  let degisimTl: number | null = null;
  let degisimKaynak: number | null = null;
  if (previous && pointValid(previous) && previous.paraBirimi === current.paraBirimi) {
    const prevKaynak = mid(previous.min, previous.max);
    // Aynı katsayı uygulanır: katsayı değişikliği "piyasa hareketi" gibi görünmesin.
    const prevTl = prevKaynak * previous.kurDegeri * adj.katsayi;
    degisimTl = pctChange(tlOrta, prevTl);
    degisimKaynak = pctChange(kaynakOrta, prevKaynak);
  }

  return {
    format: current.format,
    donem: current.donem,
    tlMin,
    tlMax,
    tlOrta,
    kaynakOrta,
    degisimTl,
    degisimKaynak,
    paraBirimi: current.paraBirimi,
    kurDegeri: current.kurDegeri,
    kurTarihi: current.kurTarihi,
    kurKaynagi: current.kurKaynagi,
    kaynakAdi: current.kaynakAdi,
    katsayi: adj.katsayi,
    metotNotu: adj.metotNotu,
  };
}

/**
 * §4.1b-1 Kaynaklar arası tutarlılık: aynı format için birden çok benchmark'ın
 * (TL'ye çevrilmiş) orta değerleri arasındaki en büyük göreli fark.
 * sapma = (max − min) / min. Eşik (varsayılan 0,40) aşılırsa hücre yayınlanmaz.
 */
export function sourceDivergence(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n) && n > 0);
  if (v.length < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return (hi - lo) / lo;
}

export function isPublishable(values: number[], threshold = 0.4): boolean {
  const valid = values.filter((n) => Number.isFinite(n) && n > 0);
  if (valid.length === 0) return false;
  const d = sourceDivergence(valid);
  return d === null || d <= threshold;
}

export type MergedBand = {
  format: string;
  durum: "ok" | "veri_yok" | "tutarsiz";
  tlMin?: number;
  tlMax?: number;
  degisimTl?: number | null;
  degisimKaynak?: number | null;
  sapma?: number | null;
  bantlar: CpmBand[]; // detayda her kaynağın satırı ayrı gösterilir
};

function meanOrNull(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x !== null);
  return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
}

/**
 * Aynı format ve dönem için birden çok kaynağın bantlarını birleştirir.
 * Kaynaklar arası sapma eşiği aşarsa hücre "tutarsiz" olur ve sayı gösterilmez (§4.1b-1).
 * Birleşik bant = en düşük alt sınır … en yüksek üst sınır (daraltma yapılmaz).
 */
export function mergeBands(format: string, bands: CpmBand[], threshold = 0.4): MergedBand {
  if (bands.length === 0) return { format, durum: "veri_yok", bantlar: [] };
  const mids = bands.map((b) => b.tlOrta);
  const sapma = sourceDivergence(mids);
  if (!isPublishable(mids, threshold)) return { format, durum: "tutarsiz", sapma, bantlar: bands };
  return {
    format,
    durum: "ok",
    tlMin: Math.min(...bands.map((b) => b.tlMin)),
    tlMax: Math.max(...bands.map((b) => b.tlMax)),
    degisimTl: meanOrNull(bands.map((b) => b.degisimTl)),
    degisimKaynak: meanOrNull(bands.map((b) => b.degisimKaynak)),
    sapma,
    bantlar: bands,
  };
}
