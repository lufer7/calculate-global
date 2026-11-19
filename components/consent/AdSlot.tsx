"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "./useConsent";

/**
 * AdSense slotu (§2): sayfa başına tek yan + tek alt slot; hesaplama formunun içine asla konmaz.
 * Yayıncı kimliği, slot kimliği ve kullanıcı rızası yoksa hiçbir şey render etmez.
 */
export function AdSlot({ yer }: { yer: "yan" | "alt" }) {
  const c = useConsent();
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = yer === "yan" ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_YAN : process.env.NEXT_PUBLIC_ADSENSE_SLOT_ALT;
  const pushed = useRef(false);
  useEffect(() => {
    if (c !== "kabul" || !client || !slot || pushed.current) return;
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({});
      pushed.current = true;
    } catch {
      /* reklam engelleyici */
    }
  }, [c, client, slot]);
  if (c !== "kabul" || !client || !slot) return null;
  return (
    <aside aria-label="Reklam" className="mt-8">
      <p className="label mb-1">// reklam</p>
      <ins className="adsbygoogle block" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
