import Link from "next/link";
import type { Metadata } from "next";
import { PromptBar } from "@/components/PromptBar";
import { IconArrowRight } from "@/components/icons";
import { NAV, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { getAllTerms } from "@/lib/sozluk/load";
import { TOOLS } from "@/lib/calc/tools";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
  alternates: { canonical: "/" },
};

/** Kart etiketleri nav adlarıyla BİREBİR aynı (§1b). Başlık soru, alt metin cevap. */
const KARTLAR: { href: string; soru: string; cevap: string }[] = [
  { href: "/sozluk", soru: "SSP ile Ad Exchange aynı şey mi?", cevap: "Değil. Terimleri insan diliyle, sık yapılan karışıklıklarıyla birlikte anlatıyoruz." },
  { href: "/hesapla", soru: "Bin gösterim kaça geldi?", cevap: "İki alanı gir, üçüncüsü çıksın. Formül açıkta, linki kopyala, ekibe at." },
  { href: "/reach-tahmin", soru: "Bu bütçe kaç kişi eder?", cevap: "Bütçe, CPM ve universe'ten tahmini tekil erişim ve frekans dağılımı." },
  { href: "/envanter", soru: "Bu siteye girebiliyor muyum?", cevap: "ads.txt'te hangi SSP'ler var, DIRECT mi RESELLER mı, site Türkiye'de ne kadar büyük." },
  { href: "/hedef-kitle", soru: "Brief'ten kitle listesi çıkar mı?", cevap: "Brief'i yapıştır, DSP'yi seç, renk kodlu Excel'i indir." },
  { href: "/rapor", soru: "Bu rapor ne anlatıyor?", cevap: "Raporu at, yorumu bekle: nerede para kaçıyor, patron neyi soracak." },
];

export default function HomePage() {
  const terimSayisi = getAllTerms().length;
  const aracSayisi = TOOLS.length;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "tr-TR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/sozluk?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="border-b border-border-dim">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <p className="label">// {SITE_TAGLINE}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Programatiğin tamamı,
              <br />
              <span className="text-accent">tek masada.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
              Terimi çöz, CPM&apos;i hesapla, pacing&apos;i kontrol et. Formüller açık, kaynaklar yazılı, tahminler
              tahmin olarak etiketli. Metrobüste de çalışır.
            </p>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-mono text-sm">
              <div>
                <dt className="label">terim</dt>
                <dd className="num mt-1 text-xl text-text">{terimSayisi}</dd>
              </div>
              <div>
                <dt className="label">hesaplayıcı</dt>
                <dd className="num mt-1 text-xl text-text">{aracSayisi}</dd>
              </div>
              <div>
                <dt className="label">uydurma sayı</dt>
                <dd className="num mt-1 text-xl text-up">0</dd>
              </div>
            </dl>
          </div>
          <div className="self-end">
            <PromptBar />
          </div>
        </div>
      </section>

      <section aria-labelledby="moduller" className="mx-auto max-w-6xl px-4 py-14">
        <h2 id="moduller" className="label">
          // Modüller
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KARTLAR.map((k, i) => {
            const nav = NAV.find((n) => n.href === k.href)!;
            return (
              <li key={k.href}>
                <Link href={k.href} className="card group flex h-full flex-col p-5 transition-colors hover:border-muted">
                  <span className="flex items-center justify-between gap-2">
                    <span className="label">
                      {String(i + 1).padStart(2, "0")} / {nav.ad.toLocaleUpperCase("tr-TR")}
                    </span>
                    {!nav.hazir && (
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                        yakında
                      </span>
                    )}
                  </span>
                  <span className="mt-4 text-lg font-semibold leading-snug text-text">{k.soru}</span>
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{k.cevap}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent">
                    {nav.hazir ? "aç" : "ne olacak?"}
                    <IconArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
