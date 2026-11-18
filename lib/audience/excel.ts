/**
 * Excel üretimi (exceljs) — §M6 çıktı kuralları, harfiyen:
 * - Keyword listesi: tek kolon, her hücrede bir keyword, dikey; başka hiçbir şey yok.
 * - 3P çalışması: tek dosya; Adform ve Amazon sheet'leri (DV360 seçildiyse ek sheet);
 *   kolonlar: Grup | Kitle Adı | Sağlayıcı/Kategori | CPM-Fee (TL) | UID/Reach | Audience Id (yalnız Amazon) | Seçim Nedeni
 *   Seçim Nedeni son kolon; gruplar renk kodlu; en altta OR/AND notu + ortalama data maliyeti.
 * Tarayıcıda ve sunucuda çalışır.
 */
import type ExcelJSNs from "exceljs";
import type { AudienceResult, CiktiSatiri } from "./schema";
import type { Dsp } from "./segments";

type ExcelJS = typeof ExcelJSNs;

export const SHEET_AD: Record<Dsp, string> = { adform: "Adform", amazon: "Amazon", dv360: "DV360" };

/** Açık, birbirinden ayrışan dolgu renkleri (koyu metinle okunur). */
export const GRUP_RENKLERI = ["FFFFE8B3", "FFCDE7FF", "FFD4F5E2", "FFFFD6DB", "FFE6DCFF", "FFFFF3C4", "FFD9F2F7", "FFEDEDED"];

export function headersFor(dsp: Dsp): string[] {
  return dsp === "amazon"
    ? ["Grup", "Kitle Adı", "Sağlayıcı/Kategori", "CPM-Fee (TL)", "UID/Reach", "Audience Id", "Seçim Nedeni"]
    : ["Grup", "Kitle Adı", "Sağlayıcı/Kategori", "CPM-Fee (TL)", "UID/Reach", "Seçim Nedeni"];
}

export function rowFor(dsp: Dsp, r: CiktiSatiri): (string | number | null)[] {
  const base = [r.grup, r.kitleAdi, r.saglayici, r.cpmTl, r.reach];
  return dsp === "amazon" ? [...base, r.audienceId, r.secimNedeni] : [...base, r.secimNedeni];
}

const fmtTl = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function noteFor(result: AudienceResult, dsp: Dsp): string {
  const ort = result.ortalamaDataCpm[dsp];
  const maliyet = ort == null ? "listede CPM bilgisi yok" : `${fmtTl.format(ort)} TL (seçilen segmentlerin listede görünen CPM ortalaması)`;
  const haric = result.prospectingHaricTut.length ? ` Prospecting'den hariç tut: ${result.prospectingHaricTut.join(", ")}.` : "";
  return `Not — OR/AND: ${result.orAndNotu} Ortalama data maliyeti: ${maliyet}.${haric}`;
}

export async function buildKeywordWorkbook(Excel: ExcelJS, keywords: string[]): Promise<ArrayBuffer> {
  const wb = new Excel.Workbook();
  const ws = wb.addWorksheet("Keywords");
  for (const k of keywords) ws.addRow([k]);
  ws.getColumn(1).width = 40;
  return wb.xlsx.writeBuffer();
}

export async function buildAudienceWorkbook(Excel: ExcelJS, result: AudienceResult, dspler: Dsp[]): Promise<ArrayBuffer> {
  const wb = new Excel.Workbook();
  wb.creator = "PRGTURK";
  const order: Dsp[] = (["adform", "amazon", "dv360"] as Dsp[]).filter((d) => dspler.includes(d));
  for (const dsp of order) {
    const ws = wb.addWorksheet(SHEET_AD[dsp]);
    const header = headersFor(dsp);
    const h = ws.addRow(header);
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13161E" } }));
    const rows: CiktiSatiri[] = [
      ...(result.retargeting.length && dsp !== "dv360"
        ? result.retargeting.map((r) => ({
            grup: "Retargeting (1P)",
            kitleAdi: r.kitle,
            saglayici: `1P — ${r.kaynak}`,
            cpmTl: null,
            reach: null,
            audienceId: null,
            secimNedeni: r.tanim,
          }))
        : []),
      ...(result.sheets[dsp] ?? []).map((r) => (result.retargeting.length ? { ...r, grup: `Prospecting — ${r.grup}` } : r)),
    ];
    const grupRenk = new Map<string, string>();
    for (const r of rows) {
      if (!grupRenk.has(r.grup)) grupRenk.set(r.grup, GRUP_RENKLERI[grupRenk.size % GRUP_RENKLERI.length]!);
      const row = ws.addRow(rowFor(dsp, r));
      const argb = grupRenk.get(r.grup)!;
      row.eachCell({ includeEmpty: true }, (c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }));
      row.getCell(4).numFmt = "#,##0.00";
    }
    ws.addRow([]);
    const note = ws.addRow([noteFor(result, dsp)]);
    note.font = { italic: true };
    ws.mergeCells(note.number, 1, note.number, header.length);
    note.getCell(1).alignment = { wrapText: true, vertical: "top" };
    note.height = 48;
    const widths = dsp === "amazon" ? [22, 44, 26, 14, 14, 18, 70] : [22, 44, 26, 14, 14, 70];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  return wb.xlsx.writeBuffer();
}
