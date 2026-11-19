"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconStar } from "@/components/icons";
import { useMe } from "./useMe";

export function FavoriteButton({ tip, refId, ad }: { tip: "terim" | "mecra" | "arac"; refId: string; ad: string }) {
  const me = useMe();
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!me?.girisli) return;
    fetch(`/api/favorites?tip=${tip}&ref=${encodeURIComponent(refId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { favori: boolean }) => setFav(j.favori))
      .catch(() => {});
  }, [me, tip, refId]);
  if (!me?.hesapAcik) return null;
  if (!me.girisli) {
    return (
      <Link href={`/giris?next=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`} className="btn min-h-11 px-3 text-xs">
        <IconStar className="h-4 w-4" /> favorilere ekle
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="btn min-h-11 px-3 text-xs"
      aria-pressed={fav}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tip, ref: refId }) });
        if (r.ok) setFav(((await r.json()) as { favori: boolean }).favori);
        setBusy(false);
      }}
    >
      <IconStar className={`h-4 w-4 ${fav ? "text-accent" : ""}`} filled={fav} />
      {fav ? `${ad} favorilerde` : "favorilere ekle"}
    </button>
  );
}
