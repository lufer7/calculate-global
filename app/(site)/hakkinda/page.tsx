import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Hakkında & Veri Politikası",
  description: "PRGTURK kimin, sayılar nereden geliyor, neyi asla kullanmıyoruz.",
  alternates: { canonical: "/hakkinda" },
};

const KAYNAKLAR = [
  ["Bize ait olan", "Kendi hesaplama modellerimiz, kendi crawl'ımız (ads.txt, sellers.json)."],
  ["Ücretsiz ve açık", "Cloudflare Radar, Chrome UX Report (CrUX), yayımlanmış public benchmark raporları."],
  ["Gösterim hakkıyla alınmış", "Platformun kendi adına, kişisel hesapla aldığı ve lisansı sitede gösterime izin veren kaynaklar. Şu an yok."],
];

export default function Page() {
  return (
    <>
      <PageHeader etiket="// HAKKINDA" baslik="Hakkında & veri politikası" sistem="kaynağı olmayan sayı bu sitede yaşayamaz.">
        <p>
          PRGTURK, programatik reklam ve dijital medya çalışanları için yapılmış kişisel bir projedir. Hiçbir ajansla,
          reklamverenle ya da reklam teknolojisi şirketiyle bağı yoktur.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <section>
          <h2 className="label">// sayılar nereden geliyor</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text">Sitede gösterilen her veri yalnızca şu üç kategoriden birinden gelir:</p>
          <ol className="mt-4 space-y-3">
            {KAYNAKLAR.map(([k, v], i) => (
              <li key={k} className="card flex gap-4 p-4">
                <span className="num font-mono text-sm text-accent">0{i + 1}</span>
                <span>
                  <span className="font-semibold text-text">{k}.</span> <span className="text-muted">{v}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Bir verinin bu üçünden hangisine girdiği belirsizse kullanılmaz. Her sayının yanında kaynağı ve tarihi
            yazar.
          </p>
        </section>
        <section>
          <h2 className="label">// asla kullanmadıklarımız</h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-text">
            {[
              "Herhangi bir ajansın ya da reklamverenin DSP hesaplarından çıkan veri — ham, agregat ya da anonimleştirilmiş.",
              "Lisanslı ölçümleme verisi (Gemius, Similarweb, comScore, Nielsen, IAS/DoubleVerify raporları vb.).",
              "Müşteri adları, kampanya adları, bütçeler, rate card'lar, deal ID'leri, CPM'ler.",
              "Kaynak sitelerin kullanım şartlarını ihlal eden scraping.",
            ].map((x) => (
              <li key={x} className="flex gap-3">
                <span aria-hidden="true" className="font-mono text-down">
                  ×
                </span>
                {x}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="label">// tahmin ≠ forecast</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text">
            Tahmini CPM bantları ve reach modelleri yön göstermek içindir. Türkiye düzeltme katsayıları editöryel
            tahmindir ve öyle etiketlenir. Kampanya planında DSP&apos;nin kendi forecast&apos;i her zaman daha doğrudur.
          </p>
        </section>
      </div>
    </>
  );
}
