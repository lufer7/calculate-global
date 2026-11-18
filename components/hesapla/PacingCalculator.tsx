"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatChange, formatMoney, formatNumber, formatPercent, parseTrNumber } from "@/lib/calc/number";
import { pacing } from "@/lib/calc/pacing";
import { quip } from "@/lib/quips";
import { IconCheck, IconLink } from "@/components/icons";
import { useCopyLink, useInitialParams, writeParams } from "./useShareUrl";

const FIELDS = [
  { key: "butce", label: "Toplam bütçe", ph: "300.000", ipucu: "Flight'ın toplam bütçesi" },
  { key: "gun", label: "Toplam gün", ph: "30", ipucu: "Flight süresi" },
  { key: "gecen", label: "Geçen gün", ph: "10", ipucu: "Bugüne kadar tamamlanan gün" },
  { key: "harcanan", label: "Harcanan", ph: "80.000", ipucu: "Bugüne kadarki gerçekleşen harcama" },
] as const;
type Key = (typeof FIELDS)[number]["key"];

export function PacingCalculator() {
  const uid = useId();
  const initial = useInitialParams();
  const [vals, setVals] = useState<Record<Key, string>>({ butce: "", gun: "", gecen: "", harcanan: "" });
  const { copied, copy } = useCopyLink();

  useEffect(() => {
    if (!initial) return;
    setVals({
      butce: initial.get("butce") ?? "",
      gun: initial.get("gun") ?? "",
      gecen: initial.get("gecen") ?? "",
      harcanan: initial.get("harcanan") ?? "",
    });
  }, [initial]);
  useEffect(() => {
    if (initial) writeParams(vals);
  }, [vals, initial]);

  const p = useMemo(() => {
    const n = Object.fromEntries(FIELDS.map((f) => [f.key, parseTrNumber(vals[f.key])])) as Record<Key, number | null>;
    if (Object.values(n).some((v) => v === null)) return { filled: false as const };
    return {
      filled: true as const,
      r: pacing({ toplamButce: n.butce!, toplamGun: n.gun!, gecenGun: n.gecen!, harcanan: n.harcanan! }),
    };
  }, [vals]);

  const r = p.filled ? p.r : null;
  let sistem = quip("bos_form_pacing");
  if (p.filled && !r) sistem = "geçen gün toplam günden büyük olamaz, toplam gün sıfır olamaz.";
  else if (r?.durum === "geride") sistem = quip("pacing_geride", formatPercent(Math.abs(r.sapmaYuzde!), 1));
  else if (r?.durum === "onde") sistem = quip("pacing_onde", formatPercent(r.sapmaYuzde!, 1));
  else if (r?.durum === "yolunda") sistem = quip("pacing_yolunda");
  else if (r) sistem = "flight henüz başlamamış. sapma için en az bir gün geçmeli.";

  const ch = r?.sapmaYuzde != null ? formatChange(r.sapmaYuzde) : null;
  const rows: [string, string, string?][] = r
    ? [
        ["Harcanması gereken", formatMoney(r.harcanmasiGereken)],
        ["Sapma", ch ? ch.text : "—", ch ? (ch.direction === "up" ? "up" : ch.direction === "down" ? "down" : "") : ""],
        ["Fark", formatMoney(r.fark)],
        ["Kalan bütçe", formatMoney(r.kalanButce)],
        ["Kalan gün", formatNumber(r.kalanGun)],
        ["Gereken günlük harcama", r.gerekenGunlukHarcama === null ? "—" : formatMoney(r.gerekenGunlukHarcama)],
        ["Bu hızla dönem sonu", r.tamamlanmaProjeksiyonu === null ? "—" : formatMoney(r.tamamlanmaProjeksiyonu)],
      ]
    : [];
  const durumEtiket = { geride: "▼ GERİDE", onde: "▲ ÖNDE", yolunda: "■ YOLUNDA" } as const;

  return (
    <div className="card p-4 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`${uid}-${f.key}`} className="label">
              {f.label}
            </label>
            <input
              id={`${uid}-${f.key}`}
              inputMode="decimal"
              autoComplete="off"
              value={vals[f.key]}
              placeholder={f.ph}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              aria-describedby={`${uid}-${f.key}-ipucu`}
              className="input mt-2 text-base"
            />
            <p id={`${uid}-${f.key}-ipucu`} className="mt-1.5 text-xs text-muted">
              {f.ipucu}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6" aria-live="polite">
        {r ? (
          <div className="overflow-hidden rounded border border-border">
            <div className="flex items-center justify-between border-b border-border bg-bg px-3 py-2">
              <span className="label">// sonuç</span>
              {r.durum && (
                <span className={`font-mono text-xs font-semibold ${r.durum === "geride" ? "down" : r.durum === "onde" ? "up" : "text-text"}`}>
                  {durumEtiket[r.durum]}
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <tbody>
                {rows.map(([k, v, cls]) => (
                  <tr key={k} className="border-b border-border-dim last:border-0">
                    <th scope="row" className="px-3 py-2.5 text-left font-normal text-muted">
                      {k}
                    </th>
                    <td className={`num px-3 py-2.5 text-right ${cls ?? "text-text"}`}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-border p-6 text-center font-mono text-sm text-muted">sonuç burada görünecek</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="syslog" aria-live="polite">
          {sistem}
        </p>
        <button type="button" onClick={copy} className="btn">
          {copied ? <IconCheck className="h-4 w-4 text-up" /> : <IconLink className="h-4 w-4" />}
          {copied ? "kopyalandı" : "linki kopyala"}
        </button>
      </div>
    </div>
  );
}
