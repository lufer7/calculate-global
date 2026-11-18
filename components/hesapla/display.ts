import { formatMoney, formatNumber, formatPercent } from "@/lib/calc/number";
import type { FieldKind } from "@/lib/calc/tools";

export type ParaBirimi = "TRY" | "USD" | "EUR";

export function formatField(n: number, kind: FieldKind, pb: ParaBirimi): string {
  switch (kind) {
    case "para":
      return formatMoney(n, pb, Math.abs(n) < 1 && n !== 0 ? 4 : 2);
    case "yuzde":
      return formatPercent(n, Math.abs(n) < 1 ? 3 : 2);
    case "adet":
      return formatNumber(n, n % 1 === 0 ? 0 : 2);
  }
}

/** Girdi alanına yazılabilir (ondalık virgüllü, binlik ayırıcısız değil — okunaklı) değer */
export function toInputValue(n: number, kind: FieldKind): string {
  return formatNumber(n, kind === "adet" ? 0 : 4);
}
