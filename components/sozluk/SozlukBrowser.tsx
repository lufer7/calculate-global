"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { KATEGORILER, SEVIYELER } from "@/lib/sozluk/kategoriler";
import { trNormalize } from "@/lib/sozluk/normalize";
import { IconSearch, IconShuffle } from "@/components/icons";
import type { TermListItem } from "./types";

type Indexed = TermListItem & { nTerim: string; nAcik: string; nTanim: string };

export function SozlukBrowser({ terms }: { terms: TermListItem[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [kategori, setKategori] = useState(params.get("kategori") ?? "");
  const [seviye, setSeviye] = useState(params.get("seviye") ?? "");

  const indexed = useMemo<Indexed[]>(
    () => terms.map((t) => ({ ...t, nTerim: trNormalize(t.terim), nAcik: trNormalize(t.acik ?? ""), nTanim: trNormalize(t.tanim) })),
    [terms],
  );
  const fuse = useMemo(
    () =>
      new Fuse(indexed, {
        keys: [
          { name: "nTerim", weight: 3 },
          { name: "nAcik", weight: 2 },
          { name: "nTanim", weight: 0.6 },
        ],
        threshold: 0.34,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [indexed],
  );

  const results = useMemo(() => {
    const nq = trNormalize(q);
    let list: Indexed[] = nq ? fuse.search(nq).map((r) => r.item) : indexed;
    if (kategori) list = list.filter((t) => t.kategori.includes(kategori));
    if (seviye) list = list.filter((t) => t.seviye === seviye);
    return list;
  }, [q, kategori, seviye, fuse, indexed]);

  function syncUrl(next: { q?: string; kategori?: string; seviye?: string }) {
    const p = new URLSearchParams();
    const v = { q, kategori, seviye, ...next };
    if (v.q) p.set("q", v.q);
    if (v.kategori) p.set("kategori", v.kategori);
    if (v.seviye) p.set("seviye", v.seviye);
    const s = p.toString();
    router.replace(s ? `/sozluk?${s}` : "/sozluk", { scroll: false });
  }

  function random() {
    const pool = results.length ? results : indexed;
    const t = pool[Math.floor(Math.random() * pool.length)];
    if (t) router.push(`/sozluk/${t.slug}`);
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label htmlFor="sozluk-ara" className="sr-only">
            Terim ara
          </label>
          <div className="flex items-center gap-2 rounded border border-border bg-bg px-3 focus-within:border-accent">
            <IconSearch className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="sozluk-ara"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                syncUrl({ q: e.target.value });
              }}
              placeholder="SSP, header bidding, görülebilirlik..."
              autoComplete="off"
              className="min-h-11 flex-1 bg-transparent font-mono text-sm text-text outline-none placeholder:text-muted/60"
            />
          </div>
        </div>
        <div>
          <label htmlFor="sozluk-kategori" className="sr-only">
            Kategori
          </label>
          <select
            id="sozluk-kategori"
            className="input pr-8 text-sm"
            value={kategori}
            onChange={(e) => {
              setKategori(e.target.value);
              syncUrl({ kategori: e.target.value });
            }}
          >
            <option value="">Tüm kategoriler</option>
            {Object.entries(KATEGORILER).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sozluk-seviye" className="sr-only">
            Seviye
          </label>
          <select
            id="sozluk-seviye"
            className="input pr-8 text-sm"
            value={seviye}
            onChange={(e) => {
              setSeviye(e.target.value);
              syncUrl({ seviye: e.target.value });
            }}
          >
            <option value="">Tüm seviyeler</option>
            {Object.entries(SEVIYELER).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn" onClick={random}>
          <IconShuffle className="h-4 w-4" />
          Rastgele terim
        </button>
      </div>

      <p className="syslog mt-4" aria-live="polite">
        {results.length === 0
          ? `"${q}" için sonuç yok. yazım farklı olabilir; kısaltmayı ya da açılımını dene.`
          : `${results.length} terim listeleniyor.`}
      </p>

      <ul className="mt-6 grid gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-2">
        {results.map((t) => (
          <li key={t.slug} className="bg-panel">
            <Link href={`/sozluk/${t.slug}`} className="flex h-full flex-col gap-1.5 p-4 transition-colors hover:bg-bg-alt">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[15px] font-semibold text-text">{t.terim}</span>
                <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-widest text-muted">
                  {SEVIYELER[t.seviye]}
                </span>
              </span>
              {t.acik && <span className="text-xs text-muted">{t.acik}</span>}
              <span className="line-clamp-2 text-sm leading-relaxed text-muted">{t.tanim}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
