"use client";

import Link from "next/link";
import { thirdPartyConfigured, writeConsent } from "@/lib/consent";
import { useConsent } from "./useConsent";

/** KVKK: üçüncü taraf ölçüm/reklam çerezleri yalnızca açık rıza ile. Kabul ve red eşit ağırlıkta. */
export function ConsentBanner() {
  const c = useConsent();
  if (!thirdPartyConfigured() || c !== null) return null;
  return (
    <div role="dialog" aria-label="Çerez tercihi" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-panel">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-relaxed text-text">
          Siteyi geliştirmek için Google Analytics, giderleri karşılamak için Google AdSense kullanmak istiyoruz; ikisi de çerez kullanır. Reddedersen
          araçların hepsi aynen çalışır.{" "}
          <Link href="/gizlilik" className="text-accent underline underline-offset-2">
            Ayrıntı
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn" onClick={() => writeConsent("red")}>
            reddet
          </button>
          <button type="button" className="btn btn-primary" onClick={() => writeConsent("kabul")}>
            kabul et
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsentReset() {
  if (!thirdPartyConfigured()) return null;
  return (
    <button type="button" className="btn mt-3" onClick={() => writeConsent(null)}>
      çerez tercihimi değiştir
    </button>
  );
}
