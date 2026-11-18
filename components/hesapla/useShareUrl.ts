"use client";

import { useCallback, useEffect, useState } from "react";

/** Form durumunu URL query string'inde tutar (§M2 "linki kopyala"). */
export function useInitialParams(): URLSearchParams | null {
  const [p, setP] = useState<URLSearchParams | null>(null);
  useEffect(() => setP(new URLSearchParams(window.location.search)), []);
  return p;
}

export function writeParams(params: Record<string, string>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  window.history.replaceState(null, "", s ? `${window.location.pathname}?${s}` : window.location.pathname);
}

export function useCopyLink() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Linki kopyala:", window.location.href);
    }
  }, []);
  return { copied, copy };
}
