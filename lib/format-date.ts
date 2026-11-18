const d = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" });
const m = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });

/** 18.11.2026 */
export const formatDate = (x: string | Date) => d.format(typeof x === "string" ? new Date(x) : x);
/** "2026-10" → "Ekim 2026" */
export const formatDonem = (yyyymm: string) => {
  const [y, mo] = yyyymm.split("-").map(Number) as [number, number];
  return m.format(new Date(Date.UTC(y, mo - 1, 1)));
};
