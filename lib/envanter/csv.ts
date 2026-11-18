/**
 * CSV üretimi. Türkçe Excel ondalık virgül kullandığı için ayraç ";" ve UTF-8 BOM.
 * §4.2c: bulk export'a yalnızca bizim crawl verimiz, kategorizasyonumuz, türetilmiş kolonlar ve
 * lisansı izin veren kaynakların KOVA bilgisi girer — sağlayıcının ham sayısı girmez.
 */
export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[";\n\r]/.test(s) || /^[=+\-@\t]/.test(s) ? `"${(/^[=+\-@\t]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
