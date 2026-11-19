"use client";

import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

export function useConsent() {
  const [c, setC] = useState<"kabul" | "red" | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setC(readConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);
  return c; // undefined = henüz okunmadı (SSR)
}
