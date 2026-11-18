import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { BOT_UA } from "@/lib/net/safe-fetch";

export const metadata: Metadata = { title: "PRGTURK bot", description: "PRGTURK ads.txt / sellers.json tarayıcısı hakkında.", alternates: { canonical: "/bot" } };

export default function Page() {
  return (
    <>
      <PageHeader etiket="// BOT" baslik="PRGTURK ads.txt tarayıcısı" sistem="yayıncıları rahatsız eden bir bot olarak tanınmak istemiyoruz.">
        <p>Sunucu loglarında bizi gördüysen, ne yaptığımızı burada anlatıyoruz.</p>
      </PageHeader>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 text-[15px] leading-relaxed">
        <p>
          User-Agent: <code className="break-all text-info">{BOT_UA}</code>
        </p>
        <ul className="space-y-2">
          {[
            "Yalnızca herkese açık /ads.txt, /sellers.json ve /robots.txt dosyalarını okuruz.",
            "robots.txt'e uyarız. Bizi engellemek için: User-agent: PRGTURK-adstxt-bot / Disallow: /",
            "Bir alan adına günde en fazla bir istek yaparız.",
            "Sayfa içeriği, kullanıcı verisi ya da reklam taramayız.",
          ].map((x) => (
            <li key={x} className="flex gap-3">
              <span aria-hidden="true" className="font-mono text-accent">
                &gt;
              </span>
              {x}
            </li>
          ))}
        </ul>
        <p className="text-muted">Sorun yaşarsan hakkında sayfasındaki iletişim kanalından yazabilirsin; tarama listesinden çıkarırız.</p>
      </div>
    </>
  );
}
