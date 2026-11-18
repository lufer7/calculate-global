import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { DomainSearch } from "@/components/envanter/DomainSearch";
import { ENVANTER_KATEGORILERI } from "@/lib/envanter/kategoriler";
import { LISANS as CRUX } from "@/lib/providers/crux";
import { LISANS as CF } from "@/lib/providers/cloudflare-radar";
import { providerEnabled } from "@/lib/providers/types";

export const metadata: Metadata = {
  title: "Envanter Ara",
  description: "Bir alan adı yaz: ads.txt'te hangi SSP'ler var, DIRECT mi RESELLER mı, sellers.json doğrulaması, Türkiye büyüklük kovası ve kategori.",
  alternates: { canonical: "/envanter" },
};

export default function Page() {
  const kaynaklar = [
    { ad: "ads.txt + sellers.json crawl", acik: true, not: "bize ait — robots.txt'e uyan, günde bir istek yapan crawler" },
    { ad: "Chrome UX Report (CrUX)", acik: providerEnabled(CRUX), not: "Türkiye büyüklük kovası, aylık" },
    { ad: "Cloudflare Radar", acik: providerEnabled(CF), not: "ikinci sıralama sinyali" },
  ];
  return (
    <>
      <PageHeader etiket="04 / ENVANTER ARA" baslik="Envanter Ara" sistem="mutlak ziyaret sayısı yayınlamıyoruz. kova ve sıralama daha dürüst.">
        <p>
          Bu siteye programatik girebiliyor musun? Hangi SSP&apos;lerde, DIRECT mi RESELLER mı, Türkiye&apos;de ne kadar büyük? Aylık ziyaret gibi
          uydurma kesinlik yok: büyüklük kova olarak, kaynağı ve tarihiyle.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <div className="max-w-2xl">
          <DomainSearch />
        </div>
        <section aria-labelledby="kat">
          <h2 id="kat" className="label">
            // kategoriler
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.entries(ENVANTER_KATEGORILERI).map(([k, v]) => (
              <li key={k}>
                <Link href={`/envanter/kategori/${k}`} className="btn min-h-11 px-3 text-xs">
                  {v.ad}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="kaynak" className="grid gap-3 md:grid-cols-3">
          <h2 id="kaynak" className="sr-only">
            Veri kaynakları
          </h2>
          {kaynaklar.map((k) => (
            <div key={k.ad} className="card p-4">
              <p className="flex items-center justify-between gap-2 font-mono text-sm text-text">
                {k.ad}
                <span className={`font-mono text-[10.5px] uppercase tracking-widest ${k.acik ? "text-up" : "text-muted"}`}>{k.acik ? "■ açık" : "□ kapalı"}</span>
              </p>
              <p className="mt-2 text-xs text-muted">{k.not}</p>
            </div>
          ))}
        </section>
        <section className="card p-5">
          <h2 className="label">// kendi lisanslı verin var mı?</h2>
          <p className="mt-2 text-sm text-muted">
            Ajansının ölçümleme aboneliğinden gelen site listesini yükle; tarayıcında bizim ads.txt ve kategori verimizle birleştir, medya planı tablosu
            olarak indir. Dosyan sunucumuza gönderilmez.
          </p>
          <Link href="/envanter/kendi-verin" className="btn btn-primary mt-4">
            Kendi verini getir
          </Link>
        </section>
      </div>
    </>
  );
}
