"use client";

import { parseCsv } from "@/lib/envanter/csv-parse";

/** CSV/XLSX dosyasını tarayıcıda satırlara çevirir. Dosya sunucuya gönderilmez. */
export async function readTable(f: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(f.name)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await f.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const out: string[][] = [];
    ws.eachRow((row) => {
      out.push(
        (row.values as unknown[]).slice(1).map((v) => {
          if (v == null) return "";
          if (typeof v === "object") {
            const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[] };
            if (o.richText) return o.richText.map((r) => r.text).join("");
            if (o.text !== undefined) return String(o.text);
            if (o.result !== undefined) return String(o.result);
          }
          return String(v);
        }),
      );
    });
    return out;
  }
  return parseCsv(await f.text());
}

export function downloadBlob(data: ArrayBuffer | Blob, name: string, type: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
