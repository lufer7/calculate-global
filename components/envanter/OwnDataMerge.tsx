"use client";

import { useState } from "react";
import { findDomainColumn, parseCsv } from "@/lib/envanter/csv-parse";
import { toCsv } from "@/lib/envanter/csv";
import { normalizeHost } from "@/lib/envanter/domain";

type Ours = { kategori: string | null; iab: string | null; buyukluk: string | null; ssp: number; direct: number; reseller: number };

async function readFile(f: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(f.name)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await f.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const out: string[][] = [];
    ws.eachRow((row) => {
      const vals = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : typeof v === "object" && "text" in (v as object) ? String((v as { text: unknown }).text) : typeof v === "object" && "result" in (v as object) ? String((v as { result: unknown }).result) : String(v)));
      out.push(vals);
    });
    return out;
  }
  return parseCsv(await f.text());
}

export function OwnDataMerge() {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [col, setCol] = useState(-1);
  const [ours, setOurs] = useState<Record<string, Ours> | null>(null);
  const [durum, setDurum] = useState<string>("dosya bekleniyor. CSV ya da XLSX.");
  const [onay, setOnay] = useState(false);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setOurs(null);
    try {
      const r = await readFile(f);
      if (r.length < 2) return setDurum("dosyada veri satırı yok.");
      const i = findDomainColumn(r[0]!);
      setRows(r.slice(0, 501));
      setCol(i);
      setDurum(i === -1 ? "domain kolonunu seç." : `${Math.min(r.length - 1, 500)} satır okundu. dosya tarayıcında, sunucuya gitmedi.`);
    } catch {
      setDurum("dosya okunamadı.");
    }
  }

  async function merge() {
    if (!rows || col < 0) return;
    const domains = rows.slice(1).map((r) => r[col] ?? "").filter(Boolean);
    setDurum("bizim verimiz alınıyor (yalnızca domain listesi gönderiliyor)...");
    const res = await fetch("/api/domain/batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ domains }) });
    const j = (await res.json()) as { sonuc?: Record<string, Ours> };
    setOurs(j.sonuc ?? {});
    setDurum("birleştirildi. tablo yalnızca bu sekmede yaşıyor; sayfayı kapatınca kaybolur.");
  }

  const header = rows ? [...rows[0]!, "kategori (PRGTURK)", "IAB", "büyüklük kovası", "SSP", "DIRECT", "RESELLER"] : [];
  const merged =
    rows && ours
      ? rows.slice(1).map((r) => {
          const d = normalizeHost(r[col] ?? "")?.domain;
          const o = d ? ours[d] : undefined;
          return [...r, o?.kategori ?? "", o?.iab ?? "", o?.buyukluk ?? "", o?.ssp ?? "", o?.direct ?? "", o?.reseller ?? ""];
        })
      : null;

  function download() {
    if (!merged) return;
    const blob = new Blob([toCsv(header, merged)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "medya-plani.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <div className="card border-accent/50 p-4 text-sm leading-relaxed text-text">
        <p className="label text-accent">// önce oku</p>
        <p className="mt-2">
          Yüklediğiniz veri saklanmaz ve başka kullanıcılara gösterilmez. Dosya <strong>tarayıcınızda</strong> okunur; sunucumuza yalnızca domain listesi
          gider, metrikleriniz gitmez. Lisanslı veriyi bu şekilde işleme yetkiniz olduğundan emin olun.
        </p>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Bu veriyi kullanma yetkim var.
        </label>
      </div>
      <div>
        <label htmlFor="own-file" className="label">
          dosya (CSV / XLSX, en fazla 500 satır)
        </label>
        <input id="own-file" type="file" accept=".csv,.txt,.xlsx" disabled={!onay} onChange={(e) => onFile(e.target.files?.[0])} className="input mt-2 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-panel file:px-3 file:py-1 file:text-text disabled:opacity-50" />
      </div>
      {rows && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="own-col" className="label">
              domain kolonu
            </label>
            <select id="own-col" className="input mt-2" value={col} onChange={(e) => setCol(Number(e.target.value))}>
              <option value={-1}>— seç —</option>
              {rows[0]!.map((h, i) => (
                <option key={i} value={i}>
                  {h || `kolon ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={merge} disabled={col < 0}>
            birleştir
          </button>
          {merged && (
            <button type="button" className="btn" onClick={download}>
              CSV indir
            </button>
          )}
        </div>
      )}
      <p className="syslog" aria-live="polite">
        {durum}
      </p>
      {merged && (
        <div className="max-h-[32rem] overflow-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-alt text-left text-muted">
              <tr>
                {header.map((h, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {merged.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-t border-border-dim">
                  {r.map((c, j) => (
                    <td key={j} className={`px-3 py-1.5 ${j >= rows!.length ? "text-accent" : "text-text"}`}>
                      {String(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
