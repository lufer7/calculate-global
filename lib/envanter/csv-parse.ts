import { trNormalize } from "@/lib/sozluk/normalize";

/** Basit, RFC 4180 uyumlu CSV okuyucu; ayraç otomatik (; , sekme). Tarayıcıda da çalışır. */
export function detectDelimiter(firstLine: string): string {
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ",";
}

export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const delim = detectDelimiter(t.split(/\r?\n/, 1)[0]!);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

/** Başlıklardan domain kolonunu bulur. */
export function findDomainColumn(header: string[]): number {
  const h = header.map((x) => trNormalize(x));
  const prefs = ["domain", "alan adi", "site", "website", "url", "host", "origin"];
  for (const p of prefs) {
    const i = h.findIndex((x) => x === p);
    if (i !== -1) return i;
  }
  return h.findIndex((x) => prefs.some((p) => x.includes(p)));
}
