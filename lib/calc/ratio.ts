/**
 * Ters hesaplama motoru (§M2): "3 alandan 2'sini gir, 3'üncüsü çıksın".
 *
 * Desteklenen tüm araçlar şu biçime indirgenir:   x = (a / b) × k
 *   CPM:  x = CPM,  a = maliyet, b = impression, k = 1000
 *   CTR:  x = CTR%, a = klik,    b = impression, k = 100
 *   CPC:  x = CPC,  a = maliyet, b = klik,       k = 1
 * Buradan:
 *   a = x × b / k
 *   b = a × k / x
 */

export type RatioField = "a" | "b" | "x";
export type RatioInputs = { a?: number | null; b?: number | null; x?: number | null };

function ok(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function solveRatio(inputs: RatioInputs, k: number, unknown: RatioField): number | null {
  if (!Number.isFinite(k) || k <= 0) return null;
  const { a, b, x } = inputs;
  switch (unknown) {
    case "x":
      if (!ok(a) || !ok(b) || b === 0) return null;
      return (a / b) * k;
    case "a":
      if (!ok(x) || !ok(b)) return null;
      return (x * b) / k;
    case "b":
      if (!ok(a) || !ok(x) || x === 0) return null;
      return (a * k) / x;
  }
}
