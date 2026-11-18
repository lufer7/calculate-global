/**
 * Reach & frekans tahmin modeli (§M3). Saf fonksiyonlar — React yok.
 *
 * BU BİR TAHMİN MODELİDİR, DSP FORECAST'İ DEĞİLDİR. DSP envanteri ve kitleyi bildiği için
 * kendi forecast'i her zaman daha doğrudur.
 *
 * Model
 * -----
 *   impression = (bütçe / CPM) × 1000
 *   U'         = universe × erişilebilir oran            (tavan: bu kanalın ulaşabileceği kitle)
 *   λ          = impression / U'                          (kişi başı ortalama maruz kalma)
 *
 * Varsayılan dağılım: Poisson (bağımsız maruz kalma varsayımı)
 *   P(k)       = λ^k e^-λ / k!
 *   reach(n+)  = U' × (1 − Σ_{k=0}^{n−1} P(k))
 *   reach(1+)  = U' × (1 − e^−λ)
 *
 * Yoğunlaşma düzeltmesi (opsiyonel, admin ayarı): Negatif binom (NBD), şekil parametresi r.
 *   Gerçek kampanyalarda gösterimler bazı kişilerde yoğunlaşır; NBD bunu modeller.
 *   r → ∞ iken Poisson'a yakınsar. r küçüldükçe aynı impression ile 1+ reach düşer.
 *   P(k) = C(k+r−1, k) (r/(r+λ))^r (λ/(r+λ))^k
 *
 * Doyma noktası (tanım): bir sonraki gösterimin YENİ bir kişiye gitme olasılığının %20'ye
 * düştüğü nokta. Poisson'da e^−λ = 0,2 → λ = ln 5 ≈ 1,61 (reach ≈ %80 U').
 *
 * Kaynak: Poisson/NBD maruz kalma modelleri medya planlama literatüründe standarttır
 * (ör. Ehrenberg, NBD; Sainsbury rastgele çakışma formülü). Parametreler editöryel ayardır.
 */

export type ReachParams = {
  /** NBD şekil parametresi; null/undefined = Poisson */
  r?: number | null;
  /** 0–1 arası; universe'ün bu kanaldan erişilebilir kısmı. Varsayılan 1. */
  erisilebilirOran?: number;
};

export const DOYMA_MARJINAL = 0.2;
export const FREKANS_ESIKLERI = [1, 2, 3, 5, 10] as const;

const ok = (n: number) => Number.isFinite(n) && n >= 0;

export function impressionsFromBudget(butce: number, cpm: number): number | null {
  if (!ok(butce) || !ok(cpm) || cpm === 0) return null;
  return (butce / cpm) * 1000;
}

export function budgetFromImpressions(impression: number, cpm: number): number | null {
  if (!ok(impression) || !ok(cpm)) return null;
  return (impression / 1000) * cpm;
}

function effectiveUniverse(universe: number, p: ReachParams): number | null {
  const oran = p.erisilebilirOran ?? 1;
  if (!ok(universe) || universe === 0 || !(oran > 0 && oran <= 1)) return null;
  return universe * oran;
}

function validR(r: number | null | undefined): r is number {
  return typeof r === "number" && Number.isFinite(r) && r > 0;
}

/** P(0..maxK) — maruz kalma sayısı dağılımı. Log uzayında hesaplanır (büyük λ için kararlı). */
export function exposureDistribution(lambda: number, maxK: number, r?: number | null): number[] {
  const out: number[] = [];
  if (!validR(r)) {
    let logP = -lambda; // log P(0)
    for (let k = 0; k <= maxK; k++) {
      if (k > 0) logP += Math.log(lambda) - Math.log(k);
      out.push(lambda === 0 ? (k === 0 ? 1 : 0) : Math.exp(logP));
    }
    return out;
  }
  const p0 = r / (r + lambda);
  const q = lambda / (r + lambda);
  let logP = r * Math.log(p0); // log P(0)
  for (let k = 0; k <= maxK; k++) {
    if (k > 0) logP += Math.log(k - 1 + r) - Math.log(k) + Math.log(q);
    out.push(lambda === 0 ? (k === 0 ? 1 : 0) : Math.exp(logP));
  }
  return out;
}

/** reach(n+) oranı (0–1), U' üzerinden */
export function reachShareAtLeast(lambda: number, n: number, r?: number | null): number {
  if (n <= 0) return 1;
  const d = exposureDistribution(lambda, n - 1, r);
  const below = d.reduce((a, b) => a + b, 0);
  return Math.min(1, Math.max(0, 1 - below));
}

/** Bir sonraki gösterimin yeni kişiye gitme olasılığı = d reach(1+) / d impression × U' */
export function marginalNewReach(lambda: number, r?: number | null): number {
  if (!validR(r)) return Math.exp(-lambda);
  return Math.pow(1 + lambda / r, -(r + 1));
}

/** Doyma noktasındaki λ (marjinal yeni erişim olasılığı DOYMA_MARJINAL'e düştüğünde). */
export function saturationLambda(r?: number | null, threshold = DOYMA_MARJINAL): number {
  if (!validR(r)) return -Math.log(threshold);
  return r * (Math.pow(threshold, -1 / (r + 1)) - 1);
}

export type ReachResult = {
  impression: number;
  universe: number;
  erisilebilir: number; // U'
  lambda: number;
  reach: { n: number; kisi: number; yuzde: number }[]; // yüzde = universe'e göre
  ortalamaFrekans: number | null;
  marjinalYeniErisim: number;
  doymaImpression: number;
  doymaGecildi: boolean;
};

export function estimateReach(
  impression: number,
  universe: number,
  p: ReachParams = {},
  esikler: readonly number[] = FREKANS_ESIKLERI,
): ReachResult | null {
  const U = effectiveUniverse(universe, p);
  if (U === null || !ok(impression)) return null;
  const lambda = impression / U;
  const reach = esikler.map((n) => {
    const kisi = U * reachShareAtLeast(lambda, n, p.r);
    return { n, kisi, yuzde: (kisi / universe) * 100 };
  });
  const r1 = reach.find((x) => x.n === 1)?.kisi ?? U * reachShareAtLeast(lambda, 1, p.r);
  const doymaImpression = saturationLambda(p.r) * U;
  return {
    impression,
    universe,
    erisilebilir: U,
    lambda,
    reach,
    ortalamaFrekans: r1 > 0 ? impression / r1 : null,
    marjinalYeniErisim: marginalNewReach(lambda, p.r),
    doymaImpression,
    doymaGecildi: impression > doymaImpression,
  };
}

/**
 * Ters yön: hedef kişi sayısına n+ frekansla ulaşmak için gereken impression.
 * reach(n+) λ'ya göre monoton artan → ikiye bölme (bisection). Hedef tavanı aşıyorsa null.
 */
export function impressionsForReach(hedefKisi: number, n: number, universe: number, p: ReachParams = {}): number | null {
  const U = effectiveUniverse(universe, p);
  if (U === null || !ok(hedefKisi) || !(n >= 1)) return null;
  if (hedefKisi === 0) return 0;
  const hedefPay = hedefKisi / U;
  if (hedefPay >= 0.999) return null; // tavana asimptotik yaklaşılır, ulaşılamaz
  let lo = 0;
  let hi = 1;
  while (reachShareAtLeast(hi, n, p.r) < hedefPay) {
    hi *= 2;
    if (hi > 1e6) return null;
  }
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (reachShareAtLeast(mid, n, p.r) < hedefPay) lo = mid;
    else hi = mid;
  }
  return hi * U;
}

export type CurvePoint = { butce: number; impression: number; reach1: number; reachN: number };

/** Bütçe → reach eğrisi (grafik için). */
export function reachCurve(
  maxButce: number,
  cpm: number,
  universe: number,
  n: number,
  p: ReachParams = {},
  steps = 40,
): CurvePoint[] {
  const U = effectiveUniverse(universe, p);
  if (U === null || !ok(maxButce) || maxButce === 0 || !ok(cpm) || cpm === 0 || steps < 1) return [];
  const pts: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const butce = (maxButce * i) / steps;
    const impression = (butce / cpm) * 1000;
    const lambda = impression / U;
    pts.push({
      butce,
      impression,
      reach1: U * reachShareAtLeast(lambda, 1, p.r),
      reachN: U * reachShareAtLeast(lambda, n, p.r),
    });
  }
  return pts;
}

/**
 * "Frekans a yerine b ile gidersen" karşılaştırması (aynı bütçe, aynı CPM):
 * - ayniButceFark: aynı bütçeyle b+ gören kişi, a+ görenden kaç kişi az
 * - ekButce: a+ ile ulaşılan kişi sayısına b+ ile ulaşmak için gereken ek bütçe (ulaşılamazsa null)
 */
export function frequencyTradeoff(
  butce: number,
  cpm: number,
  universe: number,
  a: number,
  b: number,
  p: ReachParams = {},
): { reachA: number; reachB: number; ayniButceFark: number; ekButce: number | null } | null {
  const imp = impressionsFromBudget(butce, cpm);
  const U = effectiveUniverse(universe, p);
  if (imp === null || U === null || !(a >= 1) || !(b >= 1)) return null;
  const lambda = imp / U;
  const reachA = U * reachShareAtLeast(lambda, a, p.r);
  const reachB = U * reachShareAtLeast(lambda, b, p.r);
  const gerekenImp = impressionsForReach(reachA, b, universe, p);
  const ekButce = gerekenImp === null ? null : budgetFromImpressions(gerekenImp, cpm)! - butce;
  return { reachA, reachB, ayniButceFark: reachA - reachB, ekButce };
}

export type ChannelInput = { ad: string; butce: number; cpm: number; params?: ReachParams };

/**
 * Çoklu kanal birleşik reach(1+).
 * - cakisma (0–1) KULLANICI VARSAYIMIDIR: küçük kanalların kitlesinin, en büyük kanalla
 *   örtüşen payı. 0 = hiç çakışma yok (toplam, universe ile sınırlı), 1 = tam çakışma (en büyüğü).
 *   birleşik = max + (1 − çakışma) × (toplam − max)
 * - rastgele: Sainsbury formülü, kanalların bağımsız olduğu varsayımıyla referans değer.
 *   birleşik = U × (1 − Π (1 − reach_i / U))
 */
export function combineChannels(
  kanallar: ChannelInput[],
  universe: number,
  cakisma: number,
): {
  kanallar: { ad: string; impression: number; reach: number }[];
  birlesik: number;
  rastgele: number;
  toplamButce: number;
  toplamImpression: number;
} | null {
  if (!ok(universe) || universe === 0 || !(cakisma >= 0 && cakisma <= 1) || kanallar.length === 0) return null;
  const rows: { ad: string; impression: number; reach: number }[] = [];
  for (const k of kanallar) {
    const imp = impressionsFromBudget(k.butce, k.cpm);
    if (imp === null) return null;
    const est = estimateReach(imp, universe, k.params ?? {}, [1]);
    if (!est) return null;
    rows.push({ ad: k.ad, impression: imp, reach: est.reach[0]!.kisi });
  }
  const reaches = rows.map((r) => r.reach);
  const max = Math.max(...reaches);
  const sum = reaches.reduce((a, b) => a + b, 0);
  const birlesik = Math.min(universe, max + (1 - cakisma) * (sum - max));
  const rastgele = universe * (1 - reaches.reduce((acc, r) => acc * (1 - r / universe), 1));
  return {
    kanallar: rows,
    birlesik,
    rastgele,
    toplamButce: kanallar.reduce((a, k) => a + k.butce, 0),
    toplamImpression: rows.reduce((a, r) => a + r.impression, 0),
  };
}
