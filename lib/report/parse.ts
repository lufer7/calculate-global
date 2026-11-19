/**
 * Rapor dosyalarındaki sayı ve tarihlerin ayrıştırılması. DSP export'ları hem EN (1,234.56)
 * hem TR (1.234,56) biçiminde gelebilir. Saf fonksiyonlar.
 */

/** Tek bir hücreyi sayıya çevirir. Para/yüzde işaretlerini ve boşlukları atar. */
export function parseReportNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = raw.trim().replace(/[₺$€£%\s ]|TRY|TL|USD|EUR/gi, "");
  if (s === "" || s === "-" || s === "—") return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let norm: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // son görülen ayraç ondalıktır
    norm = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const commas = s.split(",").length - 1;
    norm = commas > 1 || /^\d{1,3}(,\d{3})+$/.test(s) && !/^0,/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot !== -1) {
    const dots = s.split(".").length - 1;
    norm = dots > 1 ? s.replace(/\./g, "") : s;
  } else norm = s;
  const n = Number(norm);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** Tarihi ISO (YYYY-MM-DD) biçimine çevirir. Gün-önce (TR) varsayılır; ilk alan >12 değilse ve ikinci >12 ise ABD biçimi kabul edilir. */
export function parseReportDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let y: number, m: number, d: number;
  let r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (r) {
    y = +r[1]!;
    m = +r[2]!;
    d = +r[3]!;
  } else if ((r = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) {
    const a = +r[1]!;
    const b = +r[2]!;
    y = +r[3]!;
    if (a <= 12 && b > 12) {
      m = a;
      d = b;
    } else {
      d = a;
      m = b;
    }
  } else if ((r = s.match(/^(\d{8})$/))) {
    y = +s.slice(0, 4);
    m = +s.slice(4, 6);
    d = +s.slice(6, 8);
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Adform para sütunu düzeltmesi (§M7): bazı Adform export'larında para değerleri 10^15 kat
 * büyük gelir (örn. ₺4.718.371.200.958.550 → 4,72 TL). Kolonun medyanı 10^12'yi aşıyorsa
 * tüm değerler 10^15'e bölünür.
 */
export const ADFORM_BOLEN = 1e15;
export function needsAdformFix(values: (number | null)[]): boolean {
  const v = values.filter((x): x is number => x !== null && x > 0).sort((a, b) => a - b);
  if (v.length === 0) return false;
  return v[Math.floor(v.length / 2)]! > 1e12;
}
