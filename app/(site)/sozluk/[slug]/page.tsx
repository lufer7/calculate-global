import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { MdxLink } from "@/components/sozluk/TermLink";
import { getAllTerms, getTerm } from "@/lib/sozluk/load";
import { remarkAutolink } from "@/lib/sozluk/remark-autolink";
import { KATEGORILER, SEVIYELER, type Kategori } from "@/lib/sozluk/kategoriler";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/calc/tools";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTerms().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = getTerm((await params).slug);
  if (!t) return {};
  const baslik = `${t.terim} nedir?${t.acik ? ` ${t.acik}` : ""}`;
  return {
    title: baslik,
    description: t.tanim,
    alternates: { canonical: `/sozluk/${t.slug}` },
    openGraph: { title: `${baslik} — ${SITE_NAME}`, description: t.tanim, type: "article" },
  };
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = getTerm((await params).slug);
  if (!t) notFound();
  const all = getAllTerms();
  const matchers = all.map((x) => ({
    slug: x.slug,
    names: [x.terim, ...(x.acik ? [x.acik] : []), ...x.esanlam],
    tanim: x.tanim,
  }));
  const ilgili = t.ilgiliSluglar.map((s) => all.find((x) => x.slug === s)!).filter(Boolean);
  const araclar = TOOLS.filter((tool) => tool.terimler.includes(t.slug));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: t.terim,
    ...(t.acik ? { alternateName: t.acik } : {}),
    description: t.tanim,
    url: `${SITE_URL}/sozluk/${t.slug}`,
    inLanguage: "tr-TR",
    inDefinedTermSet: { "@type": "DefinedTermSet", name: "Programatik Sözlük", url: `${SITE_URL}/sozluk` },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Sözlük", item: `${SITE_URL}/sozluk` },
      { "@type": "ListItem", position: 2, name: t.terim, item: `${SITE_URL}/sozluk/${t.slug}` },
    ],
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }} />
      <div className="border-b border-border-dim bg-bg-alt">
        <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
          <nav aria-label="Konum" className="label">
            <Link href="/sozluk" className="hover:text-accent">
              01 / SÖZLÜK
            </Link>{" "}
            / {t.kategori.map((k) => KATEGORILER[k as Kategori]).join(" · ")}
          </nav>
          <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight text-text md:text-4xl">{t.terim}</h1>
          {t.acik && <p className="mt-2 text-lg text-muted">{t.acik}</p>}
          <p className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
            seviye: <span className="text-accent">{SEVIYELER[t.seviye]}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="prose-term">
          <MDXRemote
            source={t.govde}
            components={{ a: MdxLink }}
            options={{
              mdxOptions: {
                format: "md",
                remarkPlugins: [remarkGfm, [remarkAutolink, { matchers, self: t.slug }]],
              },
            }}
          />
        </div>

        {araclar.length > 0 && (
          <aside className="card mt-10 p-5">
            <p className="label">// hesapla</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {araclar.map((a) => (
                <li key={a.slug}>
                  <Link href={`/hesapla/${a.slug}`} className="btn">
                    {a.ad} hesapla
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {ilgili.length > 0 && (
          <aside className="mt-10">
            <h2 className="label">// ilgili terimler</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {ilgili.map((r) => (
                <li key={r.slug}>
                  <Link href={`/sozluk/${r.slug}`} className="card flex min-h-11 flex-col gap-1 p-3 hover:border-muted">
                    <span className="font-mono text-sm font-semibold text-text">{r.terim}</span>
                    <span className="line-clamp-2 text-xs leading-relaxed text-muted">{r.tanim}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </article>
  );
}
