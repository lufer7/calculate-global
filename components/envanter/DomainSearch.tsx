"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeHost } from "@/lib/envanter/domain";
import { IconSearch } from "@/components/icons";

export function DomainSearch({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("domain");
    if (d) setV(d);
  }, []);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const n = normalizeHost(v);
        if (!n) return setErr("geçerli bir alan adı yaz: ornek.com");
        router.push(`/envanter/${n.domain}`);
      }}
      className="w-full"
    >
      <label htmlFor="domain-ara" className="label">
        // alan adı
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-card border border-border bg-panel px-3 focus-within:border-accent">
        <IconSearch className="h-4 w-4 shrink-0 text-muted" />
        <input
          id="domain-ara"
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setErr(null);
          }}
          placeholder="nefisyemektarifleri.com"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="url"
          className="min-h-12 flex-1 bg-transparent font-mono text-[15px] text-text outline-none placeholder:text-muted/60"
        />
        <button type="submit" className="btn btn-primary min-h-9 px-3 text-xs">
          ara
        </button>
      </div>
      <p className="syslog mt-2" aria-live="polite">
        {err ?? "ads.txt, sellers.json, büyüklük kovası. domain başına günde bir tarama."}
      </p>
    </form>
  );
}
