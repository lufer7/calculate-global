import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RatioCalculator } from "@/components/hesapla/RatioCalculator";
import { PacingCalculator } from "@/components/hesapla/PacingCalculator";
import { CpmBandsPanel } from "@/components/CpmBandsPanel";
import { AdSlot } from "@/components/consent/AdSlot";
import { FavoriteButton } from "@/components/account/FavoriteButton";
import { getTool, TOOLS } from "@/lib/calc/tools";
import { getAllTerms } from "@/lib/sozluk/load";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return TOOLS.map((t) => ({ arac: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ arac: string }> }): Promise<Metadata> {
  const t = getTool((await params).arac);
  if (!t) return {};
  return {
    title: t.baslik,
    description: `${t.soru} ${t.ozet}`,
    alternates: { canonical: `/hesapla/${t.slug}` },
  };
}

export default async function AracPage({ params }: { params: Promise<{ arac: string }> }) {
  const tool = getTool((await params).arac);
  if (!tool) notFound();
  const terms = getAllTerms();
  const ilgili = tool.terimler.map((s) => terms.find((t) => t.slug === s)).filter((t) => !!t);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.baslik,
    url: `${SITE_URL}/hesapla/${tool.slug}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "tr-TR",
    description: tool.ozet,
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader etiket={`02 / METRİK HESAPLA / ${tool.ad.toUpperCase()}`} baslik={tool.baslik}>
        <p>
          <span className="text-text">{tool.soru}</span> {tool.ozet}
        </p>
      </PageHeader>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          {tool.tip === "oran" ? <RatioCalculator tool={tool} /> : <PacingCalculator />}

          <section aria-labelledby="formul" className="card p-5">
            <h2 id="formul" className="label">
              // formül
            </h2>
            <code className="mt-3 block overflow-x-auto whitespace-pre-wrap text-sm text-info">{tool.formul}</code>
            <h2 className="label mt-6">// neden böyle</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text">{tool.neden}</p>
            <h2 className="label mt-6">// varsayımlar</h2>
            <ul className="mt-2 space-y-1.5">
              {tool.varsayimlar.map((v) => (
                <li key={v} className="flex gap-3 text-sm leading-relaxed text-muted">
                  <span aria-hidden="true" className="font-mono text-accent">
                    &gt;
                  </span>
                  {v}
                </li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-xs text-muted">kaynak: {tool.kaynak}</p>
          </section>

          {tool.slug === "cpm" && <CpmBandsPanel />}
          <AdSlot yer="alt" />
        </div>

        <aside className="space-y-6">
          <FavoriteButton tip="arac" refId={tool.slug} ad={tool.ad} />
          {ilgili.length > 0 && (
            <div>
              <h2 className="label">// sözlükte</h2>
              <ul className="mt-3 space-y-2">
                {ilgili.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/sozluk/${t.slug}`} className="card block p-3 hover:border-muted">
                      <span className="font-mono text-sm font-semibold text-text">{t.terim}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted">{t.tanim}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="label">// diğer araçlar</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {TOOLS.filter((t) => t.slug !== tool.slug).map((t) => (
                <li key={t.slug}>
                  <Link href={`/hesapla/${t.slug}`} className="btn min-h-11 px-3 text-xs">
                    {t.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <AdSlot yer="yan" />
        </aside>
      </div>
    </>
  );
}
