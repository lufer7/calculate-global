/**
 * Türkçe sayı girdisi ayrıştırma ve tr-TR biçimlendirme.
 * Kural (§6.5): biçimlendirme her zaman Intl.NumberFormat('tr-TR') ile yapılır, elle yapılmaz.
 */

/**
 * Kullanıcının yazdığı sayıyı çözer. Desteklenen biçimler:
 *   "1.234,56" → 1234.56   (TR: binlik nokta, ondalık virgül)
 *   "1234,56"  → 1234.56
 *   "1.500"    → 1500      (tek nokta + tam 3 hane → binlik ayırıcı kabul edilir)
 *   "0.5"      → 0.5       (tek nokta + 3 hane değil → ondalık kabul edilir)
 *   "₺ 2.000", "%12,5", "15 TL" → para/yüzde işaretleri ve boşluk atılır
 * Çözülemeyen girdi için null döner.
 */
export function parseTrNumber(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).trim().replace(/[₺%\s ]/g, "").replace(/(tl|try)$/i, "");
  if (s === "") return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  let normalized: string;
  if (s.includes(",")) {
    if (s.split(",").length > 2) return null;
    const [intPart, decPart] = s.split(",") as [string, string];
    if (intPart.includes(".") && !/^\d{1,3}(\.\d{3})+$/.test(intPart)) return null;
    normalized = `${intPart.replace(/\./g, "")}.${decPart}`;
  } else {
    const dots = (s.match(/\./g) ?? []).length;
    const thousandsShape = /^\d{1,3}(\.\d{3})+$/.test(s);
    if (dots === 0) normalized = s;
    else if (thousandsShape && (dots > 1 || !s.startsWith("0."))) normalized = s.replace(/\./g, "");
    else if (dots === 1) normalized = s;
    else return null;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const cache = new Map<string, Intl.NumberFormat>();
function nf(key: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("tr-TR", opts);
    cache.set(key, f);
  }
  return f;
}

/** Düz sayı: 1.234,56 */
export function formatNumber(n: number, maxFractionDigits = 2, minFractionDigits = 0): string {
  return nf(`n${maxFractionDigits}-${minFractionDigits}`, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: minFractionDigits,
  }).format(n);
}

/** Para: ₺1.234,56 (TRY) · $1.234,56 (USD) · €1.234,56 (EUR) */
export function formatMoney(n: number, currency: "TRY" | "USD" | "EUR" = "TRY", fractionDigits = 2): string {
  return nf(`m${currency}${fractionDigits}`, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

/** Yüzde: girdi yüzde puanı cinsinden (12.5 → "%12,5") */
export function formatPercent(pct: number, maxFractionDigits = 2): string {
  return nf(`p${maxFractionDigits}`, {
    style: "percent",
    maximumFractionDigits: maxFractionDigits,
  }).format(pct / 100);
}

/**
 * Değişim gösterimi: "▲ %2,1" / "▼ %0,8" / "■ %0".
 * Renk tek başına anlam taşımaz (§1) — ok işareti her zaman eşlik eder.
 */
export function formatChange(pct: number, fractionDigits = 1): { text: string; direction: "up" | "down" | "flat" } {
  const rounded = Number(pct.toFixed(fractionDigits));
  if (rounded === 0) return { text: `■ ${formatPercent(0)}`, direction: "flat" };
  const direction = rounded > 0 ? "up" : "down";
  const arrow = direction === "up" ? "▲" : "▼";
  return { text: `${arrow} ${formatPercent(Math.abs(rounded), fractionDigits)}`, direction };
}
