"use client";

import Script from "next/script";
import { useConsent } from "./useConsent";

/** GA4 ve AdSense yalnızca kabul sonrası yüklenir. */
export function ThirdPartyScripts() {
  const c = useConsent();
  if (c !== "kabul") return null;
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const ads = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {ads && <Script src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads}`} strategy="afterInteractive" crossOrigin="anonymous" />}
    </>
  );
}
