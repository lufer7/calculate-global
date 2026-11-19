"use client";

import { useEffect, useState } from "react";

export type Me = { hesapAcik: boolean; girisli: boolean; email: string | null };
let cache: Promise<Me> | null = null;

export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    cache ??= fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<Me>)
      .catch(() => ({ hesapAcik: false, girisli: false, email: null }));
    cache.then(setMe);
  }, []);
  return me;
}
