"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { parseTrNumber } from "@/lib/calc/number";
import { solveRatio, type RatioField } from "@/lib/calc/ratio";
import type { RatioTool } from "@/lib/calc/tools";
import { quip, situationForMetric } from "@/lib/quips";
import { IconCheck, IconLink } from "@/components/icons";
import { formatField, type ParaBirimi } from "./display";
import { useCopyLink, useInitialParams, writeParams } from "./useShareUrl";
import { SavePreset } from "@/components/account/SavePreset";

const FIELDS: RatioField[] = ["a", "b", "x"];

export function RatioCalculator({ tool }: { tool: RatioTool }) {
  const uid = useId();
  const initial = useInitialParams();
  const [unknown, setUnknown] = useState<RatioField>("x");
  const [vals, setVals] = useState<Record<RatioField, string>>({ a: "", b: "", x: "" });
  const [pb, setPb] = useState<ParaBirimi>("TRY");
  const { copied, copy } = useCopyLink();
  const hasMoney = [tool.a, tool.b, tool.x].some((f) => f.kind === "para");

  useEffect(() => {
    if (!initial) return;
    const u = initial.get("bilinmeyen");
    if (u === "a" || u === "b" || u === "x") setUnknown(u);
    setVals({ a: initial.get("a") ?? "", b: initial.get("b") ?? "", x: initial.get("x") ?? "" });
    const p = initial.get("pb");
    if (p === "USD" || p === "EUR" || p === "TRY") setPb(p);
  }, [initial]);

  const parsed = useMemo(
    () => ({ a: parseTrNumber(vals.a), b: parseTrNumber(vals.b), x: parseTrNumber(vals.x) }),
    [vals],
  );
  const result = solveRatio(parsed, tool.k, unknown);
  const knowns = FIELDS.filter((f) => f !== unknown);
  const invalid = knowns.filter((f) => vals[f].trim() !== "" && (parsed[f] === null || parsed[f]! < 0));
  const filled = knowns.every((f) => parsed[f] !== null);

  useEffect(() => {
    if (!initial) return; // ilk okuma bitmeden URL'i ezme
    const out: Record<string, string> = { bilinmeyen: unknown === "x" ? "" : unknown, pb: pb === "TRY" ? "" : pb };
    for (const f of knowns) out[f] = vals[f];
    writeParams(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals, unknown, pb, initial]);

  const def = { a: tool.a, b: tool.b, x: tool.x };
  const xValue = unknown === "x" ? result : parsed.x;
  const situation = situationForMetric(tool.slug, xValue);
  let sistem: string;
  if (!filled) sistem = quip("bos_form");
  else if (result === null) sistem = quip("sifira_bolme");
  else if (situation) sistem = quip(situation, formatField(xValue!, tool.x.kind, pb), tool.slug);
  else sistem = `${def[unknown].kisa} hesaplandı. formül aşağıda, varsayımlar onun altında.`;

  const fmt = (f: RatioField, n: number | null) => (n === null ? "?" : formatField(n, def[f].kind, pb));
  const shown = { ...parsed, [unknown]: result } as Record<RatioField, number | null>;

  return (
    <div className="card p-4 md:p-6">
      <fieldset>
        <legend className="label">// hangi alanı bilmiyorsun?</legend>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded border border-border bg-bg p-1" role="radiogroup">
          {FIELDS.map((f) => (
            <label
              key={f}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded px-2 text-center font-mono text-[12.5px] leading-tight transition-colors ${
                unknown === f ? "bg-accent font-semibold text-bg" : "text-muted hover:text-text"
              }`}
            >
              <input
                type="radio"
                name={`${uid}-bilinmeyen`}
                value={f}
                checked={unknown === f}
                onChange={() => setUnknown(f)}
                className="sr-only"
              />
              {def[f].label}
            </label>
          ))}
        </div>
      </fieldset>

      {hasMoney && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <label htmlFor={`${uid}-pb`} className="label">
            para birimi
          </label>
          <select id={`${uid}-pb`} value={pb} onChange={(e) => setPb(e.target.value as ParaBirimi)} className="input w-auto min-h-9 py-0 text-xs">
            <option value="TRY">₺ TRY</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {FIELDS.map((f) => {
          const isUnknown = f === unknown;
          const id = `${uid}-${f}`;
          return (
            <div key={f}>
              <label htmlFor={id} className="label label-en flex items-center justify-between">
                <span>{def[f].label}</span>
                {def[f].kind === "yuzde" && <span aria-hidden="true">%</span>}
              </label>
              {isUnknown ? (
                <output
                  id={id}
                  htmlFor={knowns.map((k) => `${uid}-${k}`).join(" ")}
                  aria-live="polite"
                  className={`num mt-2 flex min-h-11 items-center rounded border px-3 font-mono text-lg ${
                    result === null ? "border-border text-muted" : "border-accent/60 bg-accent/5 text-accent"
                  }`}
                >
                  {result === null ? "—" : formatField(result, def[f].kind, pb)}
                </output>
              ) : (
                <input
                  id={id}
                  inputMode="decimal"
                  autoComplete="off"
                  value={vals[f]}
                  onChange={(e) => setVals((v) => ({ ...v, [f]: e.target.value }))}
                  placeholder={def[f].kind === "adet" ? "1.000.000" : def[f].kind === "yuzde" ? "0,15" : "5.000"}
                  aria-invalid={invalid.includes(f) || undefined}
                  aria-describedby={def[f].ipucu ? `${id}-ipucu` : undefined}
                  className={`input mt-2 text-base ${invalid.includes(f) ? "border-down" : ""}`}
                />
              )}
              {def[f].ipucu && (
                <p id={`${id}-ipucu`} className="mt-1.5 text-xs text-muted">
                  {isUnknown ? "hesaplanan değer" : def[f].ipucu}
                </p>
              )}
              {invalid.includes(f) && <p className="mt-1 text-xs text-down">▲ sayı olarak okunamadı</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded border border-border-dim bg-bg p-3 font-mono text-[13px] leading-relaxed text-muted">
        <span className="text-info">{def.x.kisa}</span> = ({fmt("a", shown.a)} / {fmt("b", shown.b)})
        {tool.k !== 1 && <> × {tool.k}</>} = <span className="text-text">{fmt("x", shown.x)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="syslog" aria-live="polite">
          {sistem}
        </p>
        <div className="flex flex-wrap gap-2">
        <SavePreset arac={tool.slug} varsayilanAd={`${tool.ad} hesabı`} />
        <button type="button" onClick={copy} className="btn">
          {copied ? <IconCheck className="h-4 w-4 text-up" /> : <IconLink className="h-4 w-4" />}
          {copied ? "kopyalandı" : "linki kopyala"}
        </button>
        </div>
      </div>
    </div>
  );
}
