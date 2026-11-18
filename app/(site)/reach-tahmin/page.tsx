import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ReachTool } from "@/components/reach/ReachTool";
import { getReachSettings, getUniverseRefs } from "@/lib/reach/queries";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reach Tahminle",
  description:
    "Bütçe, CPM ve hedef kitle büyüklüğünden tahmini tekil erişim ve frekans dağılımı (1+, 3+, 5+, 10+). Reach eğrisi, doyma noktası, çoklu kanal senaryosu.",
  alternates: { canonical: "/reach-tahmin" },
};

export default async function Page() {
  const [refs, settings] = await Promise.all([getUniverseRefs(), getReachSettings()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Reach & Frekans Tahmini",
    url: `${SITE_URL}/reach-tahmin`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "tr-TR",
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader etiket="03 / REACH TAHMİNLE" baslik="Reach & Frekans Tahmini">
        <p>
          Bu bütçe kaç kişi eder? Basit bölme yerine azalan getirili bir maruz kalma modeli kullanıyoruz.{" "}
          <strong className="text-text">Bu bir tahmin modelidir, DSP forecast&apos;i değildir</strong> — DSP envanteri ve kitleyi bildiği için
          kendi forecast&apos;i her zaman daha doğrudur.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <ReachTool refs={refs} settings={settings} />
        <section className="card p-5" aria-labelledby="model">
          <h2 id="model" className="label">
            // model nasıl çalışıyor
          </h2>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-text">
            <p>
              <code className="text-info">impression = bütçe / CPM × 1000</code>, <code className="text-info">λ = impression / universe</code>{" "}
              (kişi başı ortalama maruz kalma). Maruz kalma sayısının Poisson dağıldığı varsayılır:{" "}
              <code className="text-info">reach(1+) = universe × (1 − e^−λ)</code>, <code className="text-info">reach(n+)</code> ise Poisson
              kuyruğuyla hesaplanır.
            </p>
            <p className="text-muted">
              Gerçek kampanyalarda gösterimler bazı kişilerde yoğunlaşır. Admin panelden kanal bazlı bir yoğunlaşma katsayısı (negatif binom,{" "}
              <code>r</code>) ve erişilebilir universe oranı ayarlanabilir; ayar yoksa model saf Poisson&apos;la çalışır.
            </p>
            <p className="text-muted">
              <strong className="text-text">Doyma noktası</strong>: bir sonraki gösterimin yeni bir kişiye gitme olasılığının %20&apos;ye düştüğü
              yer. Bunun ötesindeki bütçe çoğunlukla frekans satın alır.
            </p>
            <p className="text-muted">
              <strong className="text-text">Çoklu kanal</strong>: birleşik reach = en büyük kanal + (1 − çakışma) × diğerleri. Referans olarak
              kanalların bağımsız olduğu varsayımıyla Sainsbury formülü de gösterilir.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
