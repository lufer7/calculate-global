"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filtreleMecra, KANALLAR, SATIN_ALMA, type Dogrulama, type Mecra } from "@/lib/mecra/schema";
import { DogrulamaBadge } from "./DogrulamaBadge";

export type MecraItem = Pick<Mecra, "slug" | "mecra" | "kanal" | "tur" | "ozet" | "dspler" | "formatlar"> & { dogrulama: Dogrulama };

export function MecraBrowser({ items }: { items: MecraItem[] }) {
  const [f, setF] = useState({ kanal: "", dsp: "", satinAlma: "", format: "", q: "" });
  const [secili, setSecili] = useState<string[]>([]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setF((s) => ({ ...s, q }));
  }, []);
  const dspler = useMemo(() => Array.from(new Set(items.flatMap((m) => m.dspler.map((d) => d.dsp)))).sort((a, b) => a.localeCompare(b, "tr")), [items]);
  const formatlar = useMemo(() => Array.from(new Set(items.flatMap((m) => m.formatlar.map((x) => x.ad)))).sort((a, b) => a.localeCompare(b, "tr")), [items]);
  const list = filtreleMecra(items, f);
  const toggle = (slug: string) => setSecili((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : s.length >= 3 ? s : [...s, slug]));
  const sel = (key: keyof typeof f, label: string, opts: [string, string][]) => (
    <div>
      <label htmlFor={`mf-${key}`} className="sr-only">
        {label}
      </label>
      <select id={`mf-${key}`} className="input text-sm" value={f[key]} onChange={(e) => setF((s) => ({ ...s, [key]: e.target.value }))}>
        <option value="">{label}: tümü</option>
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="mf-q" className="sr-only">
            Mecra ara
          </label>
          <input id="mf-q" type="search" className="input text-sm" placeholder="mecra ara..." value={f.q} onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))} />
        </div>
        {sel("kanal", "Kanal", Object.entries(KANALLAR))}
        {sel("dsp", "DSP / platform", dspler.map((d) => [d, d]))}
        {sel("satinAlma", "Satın alma", SATIN_ALMA.map((s) => [s, s]))}
        {sel("format", "Format", formatlar.map((x) => [x, x]))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="syslog" aria-live="polite">
          {list.length} mecra · karşılaştırmak için en fazla 3 seç.
        </p>
        {secili.length >= 2 ? (
          <Link href={`/mecra/karsilastir?m=${secili.join(",")}`} className="btn btn-primary">
            {secili.length} mecrayı karşılaştır
          </Link>
        ) : (
          <span className="btn pointer-events-none opacity-50" aria-disabled="true">
            karşılaştır ({secili.length}/3)
          </span>
        )}
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => {
          const on = secili.includes(m.slug);
          return (
            <li key={m.slug} className={`card flex flex-col p-4 ${on ? "border-accent" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/mecra/${m.slug}`} className="font-mono text-[15px] font-semibold text-text hover:text-accent">
                  {m.mecra}
                </Link>
                <DogrulamaBadge d={m.dogrulama} />
              </div>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted">{m.kanal.map((k) => KANALLAR[k]).join(" · ")}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{m.ozet}</p>
              {m.dspler.length > 0 && <p className="mt-3 text-xs text-muted">yol: {m.dspler.map((d) => d.dsp).join(", ")}</p>}
              <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 font-mono text-xs text-muted">
                <input type="checkbox" checked={on} onChange={() => toggle(m.slug)} disabled={!on && secili.length >= 3} className="h-4 w-4 accent-[var(--accent)]" />
                karşılaştırmaya ekle
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
