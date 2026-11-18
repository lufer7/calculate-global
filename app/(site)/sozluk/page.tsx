import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SozlukBrowser } from "@/components/sozluk/SozlukBrowser";
import { getAllTerms } from "@/lib/sozluk/load";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Programatik Sözlük",
  description:
    "DSP, SSP, header bidding, VAST, viewability, ads.txt ve daha fazlası: programatik reklam terimleri insan diliyle, Türkçe.",
  alternates: { canonical: "/sozluk" },
};

export default function SozlukPage() {
  const terms = getAllTerms();
  const list = terms.map(({ slug, terim, acik, kategori, seviye, tanim }) => ({ slug, terim, acik, kategori, seviye, tanim }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/sozluk`,
    name: "Programatik Sözlük",
    inLanguage: "tr-TR",
    hasDefinedTerm: terms.map((t) => ({ "@type": "DefinedTerm", name: t.terim, url: `${SITE_URL}/sozluk/${t.slug}` })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader etiket="01 / SÖZLÜK" baslik="Programatik Sözlük" sistem={`${terms.length} terim yüklü. kısaltma karmaşası kontrol altında.`}>
        <p>
          Toplantıda herkes başını sallıyor ama kimse &ldquo;SPO&rdquo;nun açılımını hatırlamıyor. Burada her terim tek
          cümleyle, sonra insan gibi, sonra da en çok neyle karıştırıldığıyla anlatılıyor.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Suspense fallback={null}>
          <SozlukBrowser terms={list} />
        </Suspense>
      </div>
    </>
  );
}
