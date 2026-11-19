"use client";

import Link from "next/link";
import { useState } from "react";
import { IconSave } from "@/components/icons";
import { useMe } from "./useMe";

/** Aracın o anki URL parametrelerini kullanıcının hesabına kaydeder. */
export function SavePreset({ arac, varsayilanAd }: { arac: string; varsayilanAd: string }) {
  const me = useMe();
  const [durum, setDurum] = useState<string | null>(null);
  if (!me?.hesapAcik) return null;
  if (!me.girisli) {
    return (
      <Link href={`/giris?next=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`} className="btn">
        <IconSave className="h-4 w-4" /> kaydetmek için giriş
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        const ad = window.prompt("Bu hesaplamaya bir ad ver:", varsayilanAd);
        if (!ad) return;
        const girdiler = Object.fromEntries(new URLSearchParams(window.location.search));
        if (!Object.keys(girdiler).length) return setDurum("önce bir şeyler gir");
        const r = await fetch("/api/presets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ arac, ad, girdiler }) });
        setDurum(r.ok ? "kaydedildi" : ((await r.json()) as { hata?: string }).hata ?? "kaydedilemedi");
      }}
    >
      <IconSave className="h-4 w-4" />
      {durum ?? "kaydet"}
    </button>
  );
}
