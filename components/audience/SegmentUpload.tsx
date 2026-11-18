"use client";

import { useEffect, useId, useState } from "react";
import { detectColumns, DSP_AD, toSegments, type ColumnMap, type Dsp, type Segment } from "@/lib/audience/segments";
import { readTable } from "./readTable";

const FIELDS: [keyof ColumnMap, string][] = [
  ["ad", "kitle adı"],
  ["saglayici", "sağlayıcı/kategori"],
  ["cpm", "CPM (TL)"],
  ["reach", "UID/reach"],
  ["audienceId", "audience id"],
];
const LS_KEY = (d: Dsp) => `prgturk:segments:${d}`;

export function SegmentUpload({ dsp, onChange }: { dsp: Dsp; onChange: (s: Segment[]) => void }) {
  const uid = useId();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [remember, setRemember] = useState(false);
  const [msg, setMsg] = useState<string>("liste yok");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(dsp));
      if (saved) {
        const s = JSON.parse(saved) as Segment[];
        onChange(s);
        setRemember(true);
        setMsg(`${s.length} segment (bu tarayıcıda kayıtlı liste)`);
      }
    } catch {
      /* depolama kapalı olabilir */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsp]);

  function apply(r: string[][], m: ColumnMap, rem: boolean) {
    const segs = toSegments(r.slice(1), m);
    onChange(segs);
    setMsg(m.ad < 0 ? "kitle adı kolonunu seç" : `${segs.length} segment okundu`);
    try {
      if (rem && segs.length) localStorage.setItem(LS_KEY(dsp), JSON.stringify(segs));
      else localStorage.removeItem(LS_KEY(dsp));
    } catch {
      /* yoksay */
    }
  }

  async function onFile(f?: File) {
    if (!f) return;
    try {
      const r = await readTable(f);
      if (r.length < 2) return setMsg("dosyada veri yok");
      const m = detectColumns(r[0]!);
      setRows(r);
      setMap(m);
      apply(r, m, remember);
    } catch {
      setMsg("dosya okunamadı");
    }
  }

  return (
    <fieldset className="rounded border border-border-dim p-3">
      <legend className="px-1 font-mono text-xs tracking-widest text-accent">{DSP_AD[dsp].toUpperCase()} SEGMENT LİSTESİ</legend>
      <label htmlFor={`${uid}-f`} className="sr-only">
        {DSP_AD[dsp]} segment export dosyası
      </label>
      <input id={`${uid}-f`} type="file" accept=".csv,.txt,.xlsx" onChange={(e) => onFile(e.target.files?.[0])} className="input py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-panel file:px-3 file:py-1 file:text-text" />
      {rows && map && (
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {FIELDS.map(([k, l]) => (
            <div key={k}>
              <label htmlFor={`${uid}-${k}`} className="label label-en text-[10.5px]">
                {l}
              </label>
              <select
                id={`${uid}-${k}`}
                className="input mt-1 min-h-9 py-0 text-xs"
                value={map[k]}
                onChange={(e) => {
                  const m = { ...map, [k]: Number(e.target.value) };
                  setMap(m);
                  apply(rows, m, remember);
                }}
              >
                <option value={-1}>—</option>
                {rows[0]!.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `kolon ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="syslog">{msg}</p>
        <label className="inline-flex min-h-11 items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => {
              setRemember(e.target.checked);
              if (rows && map) apply(rows, map, e.target.checked);
              else if (!e.target.checked) {
                try {
                  localStorage.removeItem(LS_KEY(dsp));
                } catch {
                  /* yoksay */
                }
              }
            }}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          bu tarayıcıda hatırla
        </label>
      </div>
    </fieldset>
  );
}
